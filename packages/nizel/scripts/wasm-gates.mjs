// Measures the Rust engine against the JavaScript engine and writes
// docs/wasm-parity-report.md. JavaScript's output is the specification: a
// case passes only when the engine's bytes are identical.
//
//   node scripts/wasm-gates.mjs            # gates + report
//   node scripts/wasm-gates.mjs --section "Tabs" --show 5   # print diffs
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { tests } from 'commonmark-spec';
import * as stock from '../dist/index.js';
import { extractFrontmatter } from '../dist/frontmatter.js';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const onlySection = option('--section');
const show = Number(option('--show') ?? 0);
const reportPath = new URL('../../../docs/wasm-parity-report.md', import.meta.url);

const FLAG = { anchors: 1, autolinks: 2, safe: 4, slugClassic: 8 };

/** Loads the engine and wraps its raw linear-memory interface. */
async function loadEngine() {
  const bytes = await readFile(new URL('../engine/target/wasm32-unknown-unknown/release/nizel_engine.wasm', import.meta.url));
  const { instance } = await WebAssembly.instantiate(bytes, { env: { claim: () => -1 } });
  const { memory, input, output, render, reverse } = instance.exports;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const run = (fn, source, flags) => {
    const encoded = encoder.encode(source);
    const at = input(encoded.length);
    new Uint8Array(memory.buffer, at, encoded.length).set(encoded);
    const length = fn(encoded.length, flags);
    if (length < 0) return { status: length };
    return { html: decoder.decode(new Uint8Array(memory.buffer, output(), length)) };
  };
  return {
    render: (source, flags) => run(render, source, flags),
    reverse: (source, flags) => run(reverse, source, flags),
  };
}

/** The option sets every gate runs with: Nizel's defaults, and bare. */
const profiles = [
  { name: 'default', options: {}, flags: FLAG.anchors | FLAG.autolinks | FLAG.safe },
  { name: 'bare', options: { anchors: false, autolinks: false, frontmatter: false, safe: false }, flags: 0 },
];

/** What the backend receives: frontmatter stripped, as `prepareMeta` does. */
const prepared = (markdown, options) =>
  options.frontmatter === false ? markdown : extractFrontmatter(markdown).markdown;

const engine = await loadEngine();
const corpus = tests
  .filter((example) => !onlySection || example.section === onlySection)
  .map((example) => ({ ...example, markdown: example.markdown.replaceAll('→', '\t') }));

const results = [];
for (const profile of profiles) {
  const nizel = stock.useNizel(profile.options);
  const tally = { forward: { pass: 0, unsupported: 0, mismatch: 0 }, reverse: { pass: 0, unsupported: 0, mismatch: 0 } };
  const sections = new Map();
  const diffs = [];
  for (const example of corpus) {
    const source = prepared(example.markdown, profile.options);
    if (profile.options.template !== false && source.includes('{{')) continue;
    const expected = await nizel.html(example.markdown);
    const section = sections.get(example.section) ?? { total: 0, forward: 0, reverse: 0 };
    section.total += 1;
    sections.set(example.section, section);

    const forward = engine.render(source, profile.flags);
    if (forward.status !== undefined) tally.forward.unsupported += 1;
    else if (forward.html === expected) { tally.forward.pass += 1; section.forward += 1; }
    else { tally.forward.mismatch += 1; diffs.push({ dir: 'forward', example, expected, actual: forward.html }); }

    const expectedMarkdown = stock.htmlToMarkdown(expected);
    const back = engine.reverse(expected, profile.flags);
    if (back.status !== undefined) tally.reverse.unsupported += 1;
    else if (back.html === expectedMarkdown) { tally.reverse.pass += 1; section.reverse += 1; }
    else { tally.reverse.mismatch += 1; diffs.push({ dir: 'reverse', example, expected: expectedMarkdown, actual: back.html }); }
  }
  results.push({ profile, tally, sections, diffs, total: [...sections.values()].reduce((sum, s) => sum + s.total, 0) });
}

for (const result of results) {
  const { forward, reverse } = result.tally;
  console.log(`${result.profile.name}: forward ${forward.pass}/${result.total} (mismatch ${forward.mismatch}), reverse ${reverse.pass}/${result.total} (mismatch ${reverse.mismatch})`);
  for (const diff of result.diffs.slice(0, show)) {
    console.log(`\n--- ${result.profile.name} ${diff.dir} #${diff.example.number} (${diff.example.section})`);
    console.log('input:   ', JSON.stringify(diff.dir === 'forward' ? diff.example.markdown : diff.expected));
    console.log('expected:', JSON.stringify(diff.expected));
    console.log('actual:  ', JSON.stringify(diff.actual));
  }
}

if (!onlySection) {
  let fuzz;
  try {
    fuzz = execFileSync(process.execPath, [new URL('wasm-fuzz.mjs', import.meta.url).pathname, '--count', '200000', '--seed', '7', '--show', '0'], { encoding: 'utf8' }).trim();
  } catch (error) {
    fuzz = String(error.stdout ?? error).trim();
  }
  console.log(fuzz);
  let suites;
  try {
    suites = execFileSync(process.execPath, [new URL('../../../scripts/test-wasm-entry-points.mjs', import.meta.url).pathname], { encoding: 'utf8' });
  } catch (error) {
    suites = String(error.stdout ?? error);
  }
  const suiteLines = suites.split('\n').filter((line) => /^(ok  |FAIL)/.test(line));
  const suitesFailed = suiteLines.filter((line) => line.startsWith('FAIL')).length;
  const testsPassed = suiteLines.reduce((sum, line) => sum + Number(/(\d+) passed/.exec(line)?.[1] ?? 0), 0);
  const gate3 = `${suiteLines.length - suitesFailed}/${suiteLines.length} suites, ${testsPassed} tests passed${suitesFailed ? ` — **${suitesFailed} failing**` : ''}`;
  console.log('gate 3:', gate3);
  // Gate 4 is packages/nizel-kit/test/wasm-parity.test.mjs, part of the nizel-kit suite above.
  const kitLine = suiteLines.find((line) => /\bnizel-kit:/.test(line));
  const gate4 = kitLine ? `${kitLine.startsWith('ok') ? 'pass' : '**failing**'}: every supportedPlugins profile, both option sets (nizel-kit suite: ${/Tests\s+(.*)$/.exec(kitLine)?.[1]?.trim() ?? kitLine})` : '**not run**';

  // Gate 2: test/wasm-spec-corpora.test.mjs (every GFM spec example, four profiles, through nizel/wasm).
  let gfm;
  try {
    gfm = execFileSync('npx', ['vitest', 'run', 'test/wasm-spec-corpora.test.mjs', '--reporter', 'verbose'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' });
  } catch (error) {
    gfm = String(error.stdout ?? error);
  }
  const gfmTests = /Tests\s+(.*)$/m.exec(gfm)?.[1]?.trim() ?? 'did not run';
  // The same file runs the CommonMark corpus through the entry points (gate 1's requirement).
  const entryPoints = [...gfm.matchAll(/([✓×]) .*?> (CommonMark spec|GFM spec), ([^:]+):/g)].map(([, mark, corpus, profile]) => `${mark === '✓' ? 'pass' : 'FAIL'} ${corpus} ${profile}`);
  const gfm2 = `${/failed/.test(gfmTests) || gfmTests === 'did not run' ? '**failing**' : 'pass'}: all 672 GFM 0.29 spec examples, forward and reverse (Nizel's HTML and the spec's), identical through nizel/wasm and produced by the engine, with default, bare, GFM-plugin and task-list+autolink options (${gfmTests})`;
  console.log('gate 2:', gfm2);

  let fallbacks;
  try {
    fallbacks = execFileSync(process.execPath, [new URL('wasm-fallbacks.mjs', import.meta.url).pathname, '--count', '20000', '--seed', '5'], { encoding: 'utf8' }).trim();
  } catch (error) {
    fallbacks = String(error.stdout ?? error).trim();
  }
  console.log(fallbacks);
  const [fallbackSummary, ...fallbackReasons] = fallbacks.split('\n');
  const onlyNizel002 = fallbackReasons.every((line) => line.includes('NIZEL-002'));
  const gate6 = `${fallbackSummary.replace(/^fallbacks: /, '')}${fallbackReasons.length ? `: ${fallbackReasons.map((line) => line.slice(0, line.indexOf('  e.g. ')).trim().replace(/\s{2,}/g, ' ')).join('; ')}` : ''}${fallbackReasons.length && onlyNizel002 ? ' — only input the JavaScript never finishes on' : ''}`;

  // Speed: the raw engine (encode, render, decode) against useNizel().html.
  const { performance } = await import('node:perf_hooks');
  const benchmarkFixtures = new URL('../../../apps/benchmarks/fixtures/', import.meta.url);
  const speedFixtures = {};
  for (const name of ['commonmark', 'gfm', 'readme', 'large', 'code-heavy']) {
    speedFixtures[name] = await readFile(new URL(name + '.md', benchmarkFixtures), 'utf8');
  }
  speedFixtures['46 KB GFM'] = speedFixtures.gfm.repeat(82);
  speedFixtures['emphasis draft'] = 'This is a required **bold passage** with *emphasis* in the same line.\n\n'.repeat(800);
  speedFixtures['plain draft'] = 'First paragraph with simple notes.\n\nSecond paragraph with a useful addition.\n\n'.repeat(700);
  const speedNizel = stock.useNizel({ plugins: [], frontmatter: false, template: false });
  // Process CPU time, not wall time: on a loaded machine wall time measures
  // the scheduler. Both engines are measured the same way, interleaved.
  const cpu = () => {
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000;
  };
  const median = async (run, source) => {
    const repeats = Math.max(5, Math.min(400, Math.ceil(200000 / source.length)));
    const samples = [];
    for (let round = 0; round < 25; round += 1) {
      const start = cpu();
      for (let i = 0; i < repeats; i += 1) await run(source);
      if (round > 4) samples.push((cpu() - start) / repeats);
    }
    samples.sort((a, b) => a - b);
    return samples[samples.length >> 1];
  };
  const speedRows = [];
  const reverseRows = [];
  for (const [name, source] of Object.entries(speedFixtures)) {
    const identical = engine.render(source, FLAG.anchors | FLAG.autolinks | FLAG.safe).html === await speedNizel.html(source);
    const js = await median((s) => speedNizel.html(s), source);
    const rust = await median((s) => engine.render(s, FLAG.anchors | FLAG.autolinks | FLAG.safe), source);
    speedRows.push(`| ${name} | ${source.length} | ${identical ? 'yes' : '**no**'} | ${js.toFixed(3)} | ${rust.toFixed(3)} | ${(js / rust).toFixed(1)}x |`);
    const html = await speedNizel.html(source);
    const sameBack = engine.reverse(html, 0).html === stock.htmlToMarkdown(html);
    const jsBack = await median((s) => stock.htmlToMarkdown(s), html);
    const rustBack = await median((s) => engine.reverse(s, 0), html);
    reverseRows.push(`| ${name} | ${html.length} | ${sameBack ? 'yes' : '**no**'} | ${jsBack.toFixed(3)} | ${rustBack.toFixed(3)} | ${(jsBack / rustBack).toFixed(1)}x |`);
  }
  console.log(speedRows.join('\n'));
  console.log(reverseRows.join('\n'));
  const lines = [
    '# Wasm engine parity report',
    '',
    'Generated by `node packages/nizel/scripts/wasm-gates.mjs` on the `wasm-engine` branch. A case passes only when the Rust',
    'engine\'s output is byte-identical to the JavaScript engine\'s. "Unsupported" means the engine declined (JavaScript would',
    'run); "mismatch" means it produced different bytes, which is a bug.',
    '',
    '## Gate 1: CommonMark corpus',
    '',
    `Through the entry points (test/wasm-spec-corpora.test.mjs): ${entryPoints.filter((line) => line.includes('CommonMark')).join('; ') || '**not run**'}. Below: the raw engine, case by case.`,
    '',
    '| Profile | Forward pass | Forward mismatch | Reverse pass | Reverse mismatch | Cases |',
    '| --- | --- | --- | --- | --- | --- |',
    ...results.map(({ profile, tally, total }) =>
      `| ${profile.name} | ${tally.forward.pass} | ${tally.forward.mismatch} | ${tally.reverse.pass} | ${tally.reverse.mismatch} | ${total} |`),
    '',
    '### By section (default profile, forward / reverse passing)',
    '',
    '| Section | Cases | Forward | Reverse |',
    '| --- | --- | --- | --- |',
    ...[...results[0].sections].map(([name, s]) => `| ${name} | ${s.total} | ${s.forward} | ${s.reverse} |`),
    '',
    '## Other gates',
    '',
    '| Gate | Status |',
    '| --- | --- |',
    `| 2. GFM spec | ${gfm2} |`,
    `| 3. Nizel suite through Wasm entry points | ${gate3} |`,
    `| 4. nizel-kit parity, every profile | ${gate4} |`,
    `| 5. Differential fuzzer (seed 7) | ${fuzz.replace(/^fuzz: /, 'forward: ').replace(/\n/g, '; ')} |`,
    `| 6. Fallbacks (nizel/wasm and every nizel-kit/wasm profile, fixtures + 20k fuzz) | ${gate6} |`,
    '| 7. Lezin iPhone tests | not run |',
    '| Speed (≥5x, cold start, size) | forward measured below (raw engine, not yet behind the entry points) |',
    '',
    '## Speed: forward, raw engine vs `useNizel().html` (Node, CPU time, warm median)',
    '',
    '| Fixture | Bytes | Identical | JavaScript CPU ms | Engine CPU ms | Speedup |',
    '| --- | --- | --- | --- | --- | --- |',
    ...speedRows,
    '',
    '## Speed: reverse, raw engine vs `htmlToMarkdown` (Node, CPU time, warm median)',
    '',
    '| Fixture (as HTML) | Bytes | Identical | JavaScript CPU ms | Engine CPU ms | Speedup |',
    '| --- | --- | --- | --- | --- | --- |',
    ...reverseRows,
    '',
  ];
  await writeFile(reportPath, lines.join('\n'));
  console.log('\nwrote docs/wasm-parity-report.md');
}

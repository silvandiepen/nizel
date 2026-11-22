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
  const { instance } = await WebAssembly.instantiate(bytes);
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
  const lines = [
    '# Wasm engine parity report',
    '',
    'Generated by `node packages/nizel/scripts/wasm-gates.mjs` on the `wasm-engine` branch. A case passes only when the Rust',
    'engine\'s output is byte-identical to the JavaScript engine\'s. "Unsupported" means the engine declined (JavaScript would',
    'run); "mismatch" means it produced different bytes, which is a bug.',
    '',
    '## Gate 1: CommonMark corpus',
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
    '| 2. GFM cases | not built yet |',
    '| 3. Nizel suite through Wasm entry points | not built yet |',
    '| 4. nizel-kit parity, every profile | not built yet |',
    `| 5. Differential fuzzer (forward, seed 7) | ${fuzz.replace(/^fuzz: /, '')} |`,
    '| 6. Zero syntax fallbacks | not met (engine declines unported syntax) |',
    '| 7. Lezin iPhone tests | not run |',
    '| Speed (≥5x, cold start, size) | not measured |',
    '',
  ];
  await writeFile(reportPath, lines.join('\n'));
  console.log('\nwrote docs/wasm-parity-report.md');
}

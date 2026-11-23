// Gate 6 of NIZEL-001: through the WebAssembly entry points (nizel/wasm and
// every nizel-kit/wasm plugin profile), did the engine produce each result?
// Counts every conversion left to JavaScript, by the engine's reason.
//
//   node scripts/wasm-fallbacks.mjs [--count 20000] [--seed 5]
import { readFile } from 'node:fs/promises';

// Count engine calls and keep the last status. Installed before the entry
// points create their instances (lazily, on first use).
const calls = { render: 0, parse: 0, reverse: 0 };
let reverseAttempts = 0;
let lastStatus = 0;
const Instance = WebAssembly.Instance;
WebAssembly.Instance = class extends Instance {
  constructor(...args) {
    super(...args);
    const exports = this.exports;
    const counted = { ...exports };
    for (const name of ['render', 'parse', 'reverse']) {
      counted[name] = (...a) => {
        const n = exports[name](...a);
        lastStatus = n;
        if (name === 'reverse') reverseAttempts += 1;
        if (n >= 0) calls[name] += 1;
        return n;
      };
    }
    Object.defineProperty(this, 'exports', { value: counted });
  }
};

const wasm = await import('../dist/wasm.js');
const { extractFrontmatter } = await import('../dist/frontmatter.js');
const kit = await import('nizel-kit/wasm');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : Number(args[index + 1]);
};
const count = option('--count', 20000);
let seed = option('--seed', 5) >>> 0;
const random = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % n;
};

/** The engine's reason for its last status. */
const statusReason = (status) => ({
  [-2]: 'invalid UTF-8',
  [-3]: 'engine asked for JavaScript',
}[status] ?? `status ${status}`);

const fallbacks = new Map();
let handled = 0;
let total = 0;
/** Records a conversion left to JavaScript, under its direction and reason. */
const fallback = (label, direction, reason, sample) => {
  total += 1;
  const key = `${direction}: ${reason}`;
  const entry = fallbacks.get(key) ?? { count: 0, labels: new Set(), sample };
  entry.count += 1;
  entry.labels.add(label);
  fallbacks.set(key, entry);
};
const engineCalls = () => calls.render + calls.parse;

/** One Markdown → HTML conversion through `convert`, counted. */
const forward = async (label, convert, markdown, frontmatter = true) => {
  const source = frontmatter ? extractFrontmatter(markdown).markdown : markdown;
  if (source.length > 1024 * 1024) return fallback(label, 'forward', 'over the size limit', source);
  const before = engineCalls();
  await convert(markdown);
  if (engineCalls() > before) {
    total += 1;
    handled += 1;
  } else {
    fallback(label, 'forward', statusReason(lastStatus), source);
  }
};

/**
 * One HTML → Markdown conversion through `convert`, counted. A throw is the
 * engine's when it reported it (an entity the JavaScript throws on) or when a
 * plugin handler threw during the engine's call: the backend rethrows that at
 * once, after one attempt, where a real fallback of a well-formed source tries
 * every marker block first. (The fuzzer checks both errors match JavaScript's.)
 */
const reverse = (label, convert, html) => {
  const before = calls.reverse;
  const attempts = reverseAttempts;
  let threw = false;
  try {
    convert(html);
  } catch {
    threw = true;
  }
  if (calls.reverse > before || lastStatus === -4 || (threw && lastStatus === -3 && reverseAttempts === attempts + 1 && html.isWellFormed())) {
    total += 1;
    handled += 1;
  } else {
    fallback(label, 'reverse', html.length > 1024 * 1024 ? 'over the size limit' : statusReason(lastStatus), html);
  }
};

// Documents: the benchmark fixtures, then fuzz documents from the fuzzer's own building blocks.
const fixtures = new URL('../../../apps/benchmarks/fixtures/', import.meta.url);
const markdownDocs = [];
for (const name of ['commonmark', 'gfm', 'readme', 'large', 'code-heavy']) {
  markdownDocs.push(await readFile(new URL(name + '.md', fixtures), 'utf8'));
}
const fuzzSource = await readFile(new URL('wasm-fuzz.mjs', import.meta.url), 'utf8');
const listAt = (name) => {
  const start = fuzzSource.indexOf(`const ${name} = [`) + `const ${name} = `.length;
  return (0, eval)(fuzzSource.slice(start, fuzzSource.indexOf('];', start) + 1));
};
const atoms = listAt('atoms');
const htmlAtoms = listAt('htmlAtoms');
const htmlDocs = [];
for (let i = 0; i < count; i += 1) {
  let markdown = '';
  for (let j = 0, n = 1 + random(14); j < n; j += 1) markdown += atoms[random(atoms.length)];
  markdownDocs.push(markdown);
  let soup = '';
  for (let j = 0, n = 1 + random(16); j < n; j += 1) soup += htmlAtoms[random(htmlAtoms.length)];
  htmlDocs.push(soup);
}

// nizel/wasm, default and bare options.
const processor = wasm.useNizel();
const bare = wasm.useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false });
for (const [index, markdown] of markdownDocs.entries()) {
  await forward('nizel', (m) => processor.html(m), markdown);
  if (index % 2) await forward('nizel bare', (m) => bare.html(m), markdown, false);
}
for (const [index, html] of htmlDocs.entries()) {
  reverse('nizel', (h) => wasm.htmlToMarkdown(h, index % 3 === 0 ? { unsupported: 'drop' } : {}), html);
}
for (const markdown of markdownDocs.slice(0, 5)) reverse('nizel', (h) => wasm.htmlToMarkdown(h), await processor.html(markdown));

// nizel-kit/wasm: every profile of packages/nizel-kit/test/wasm-parity.test.mjs, both option sets, on a share of the documents.
const profiles = [
  [],
  ['sanitize', 'autolink', 'hidden-comments'],
  kit.defaultEnabledPlugins(),
  ['gfm', 'hidden-comments', 'task-list'],
  ['sanitize', 'autolink', 'hidden-comments', 'task-list'],
  ...kit.supportedPlugins.map((plugin) => [plugin.id]),
];
const pluginOptionSets = [{}, { 'task-list': { mode: 'edit' }, 'hidden-comments': { mode: 'hide' } }];
const share = Math.max(5, Math.floor(count / 50));
for (const enabledPlugins of profiles) for (const pluginOptions of pluginOptionSets) {
  const options = { enabledPlugins, pluginOptions, template: false };
  const accelerated = kit.useNizelKit(options);
  const label = `kit [${enabledPlugins.join(',') || 'none'}]${Object.keys(pluginOptions).length ? ' +options' : ''}`;
  for (const markdown of markdownDocs.slice(0, share)) await forward(label, (m) => accelerated.markdownToHtml(m), markdown);
  for (const html of htmlDocs.slice(0, share)) reverse(label, (h) => accelerated.htmlToMarkdown(h), html);
}

console.log(`fallbacks: ${total - handled} of ${total} conversions left to JavaScript`);
for (const [key, { count: n, labels, sample }] of [...fallbacks].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${n}  ${key}  (${labels.size} entry point${labels.size === 1 ? '' : 's'})  e.g. ${JSON.stringify(sample).replace(/[\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`).slice(0, 70)}`);
}

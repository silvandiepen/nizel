import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'vitest';

// Gates 1 and 2 of the WebAssembly engine through the entry points: every
// CommonMark and GFM spec example, forward and reverse (Nizel's HTML and the
// spec's), is byte-identical to JavaScript through nizel/wasm and produced
// by the engine, not a fallback.

// Count engine calls; installed before nizel/wasm creates its instance.
const calls = { forward: 0, reverse: 0 };
const Instance = WebAssembly.Instance;
WebAssembly.Instance = class extends Instance {
  constructor(...args) {
    super(...args);
    const exports = this.exports;
    const counted = { ...exports };
    for (const [name, key] of [['render', 'forward'], ['parse', 'forward'], ['reverse', 'reverse']]) {
      counted[name] = (...a) => {
        const n = exports[name](...a);
        if (n >= 0) calls[key] += 1;
        return n;
      };
    }
    Object.defineProperty(this, 'exports', { value: counted });
  }
};

const stock = await import('../dist/index.js');
const wasm = await import('../dist/wasm.js');
const { gfmPlugins } = await import('../../plugin-gfm/dist/index.js');
const { taskListPlugin } = await import('../../plugin-task-list/dist/index.js');
const { autolinkPlugin } = await import('../../plugin-autolink/dist/index.js');
const { tests: commonmark } = await import('commonmark-spec');
const gfm = JSON.parse(await readFile(new URL('./fixtures/gfm-spec.json', import.meta.url), 'utf8'));

const defaults = ['default', {}];
const bare = ['bare', { anchors: false, autolinks: false, frontmatter: false, safe: false }];
const corpora = [
  {
    name: 'CommonMark spec',
    examples: commonmark.map((example) => ({ ...example, markdown: example.markdown.replaceAll('→', '\t'), example: example.number })),
    profiles: [defaults, bare],
  },
  {
    name: 'GFM spec',
    examples: gfm,
    profiles: [defaults, bare, ['gfm plugins', { plugins: gfmPlugins() }], ['task list (edit) and autolink', { plugins: [taskListPlugin({ mode: 'edit' }), autolinkPlugin()] }]],
  },
];

/** The result of `convert`, or the error it throws, comparable across engines. */
const outcome = (convert) => {
  try {
    return convert();
  } catch (error) {
    return { threw: `${error.constructor.name}: ${error.message}` };
  }
};

for (const { name: corpus, examples, profiles } of corpora) for (const [name, options] of profiles) {
  test(`${corpus}, ${name}: all ${examples.length} examples identical through nizel/wasm, on the engine`, async () => {
    const original = stock.useNizel(options);
    const accelerated = wasm.useNizel(options);
    const reverseOptions = options.plugins ? { plugins: options.plugins } : {};
    const differences = [];
    const fallbacks = [];
    const start = { ...calls };
    let converted = 0;
    for (const example of examples) {
      if (example.markdown.includes('{{')) continue;
      converted += 1;
      const label = `#${example.example} (${example.section})`;
      const expected = await original.html(example.markdown);
      const before = calls.forward;
      const actual = await accelerated.html(example.markdown);
      if (calls.forward === before) fallbacks.push(`forward ${label}`);
      if (actual !== expected) differences.push({ label, direction: 'forward', expected, actual });

      // Reverse: Nizel's own output, and the spec's reference HTML.
      for (const html of [expected, example.html]) {
        const want = outcome(() => stock.htmlToMarkdown(html, reverseOptions));
        const beforeReverse = calls.reverse;
        const got = outcome(() => wasm.htmlToMarkdown(html, reverseOptions));
        if (calls.reverse === beforeReverse && !want?.threw) fallbacks.push(`reverse ${label}`);
        if (JSON.stringify(got) !== JSON.stringify(want)) differences.push({ label, direction: 'reverse', html, expected: want, actual: got });
      }
    }
    assert.deepEqual(differences.slice(0, 3), []);
    assert.deepEqual(fallbacks, []);
    // Not vacuous: the engine ran for every conversion.
    assert.ok(converted > examples.length * 0.9);
    assert.ok(calls.forward - start.forward >= converted);
    assert.ok(calls.reverse - start.reverse >= converted * 2 - 50);
  }, 120_000);
}

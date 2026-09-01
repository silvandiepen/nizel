import assert from 'node:assert/strict';
import { describe, test } from 'vitest';
import {
  completeStreamingMarkdown,
  createNizelDocument,
  deserializeNizelDocument,
  renderMarkdown,
  serializeNizelDocument,
  useNizel,
  visitNizel,
} from '../dist/index.js';

describe('portable documents', () => {
  test('processes, serializes, validates, and renders a versioned document', async () => {
    const nizel = useNizel();
    const document = await nizel.document('---\ntitle: Hello\n---\n# Hello\n\nA **document**.');
    assert.equal(document.schema, 'nizel/document');
    assert.equal(document.version, 1);
    assert.equal(document.meta.title, 'Hello');

    const restored = deserializeNizelDocument(serializeNizelDocument(document));
    assert.equal(nizel.render(restored.ast), '<h1 id="hello">Hello</h1>\n<p>A <strong>document</strong>.</p>');
    assert.equal(renderMarkdown(restored), '---\ntitle: Hello\n---\n\n# Hello\n\nA **document**.');
  });

  test('rejects unsupported envelopes and non-serializable values', async () => {
    assert.throws(() => deserializeNizelDocument('{"schema":"nizel/document","version":2,"ast":{},"meta":{}}'), /version/);
    const ast = await useNizel().ast('# Hello');
    assert.throws(() => createNizelDocument(ast, { invalid: undefined }), /JSON-serializable/);
  });
});

describe('Markdown rendering', () => {
  test('round trips representative AST nodes', async () => {
    const source = '# Title\n\n- One\n- Two\n\n> Quote\n\n```js\nconst x = 1\n```';
    const nizel = useNizel();
    const ast = await nizel.ast(source);
    assert.equal(nizel.markdown(ast), source);
  });
});

describe('stream preparation', () => {
  test('completes inline syntax, links, code fences, frontmatter, and custom blocks', () => {
    assert.equal(completeStreamingMarkdown('Hello **world'), 'Hello **world**');
    assert.equal(completeStreamingMarkdown('[docs](https://example.com'), '[docs](https://example.com)');
    assert.equal(completeStreamingMarkdown('```js\nconst x = 1'), '```js\nconst x = 1\n```');
    assert.equal(completeStreamingMarkdown('---\ntitle: Draft'), '---\ntitle: Draft\n---');
    assert.equal(completeStreamingMarkdown('::alert\nCareful'), '::alert\nCareful\n::');
  });
});

describe('tree visitor', () => {
  test('walks children and supports skip', async () => {
    const ast = await useNizel().ast('# Hello **world**');
    const types = [];
    visitNizel(ast, (node) => { types.push(node.type); if (node.type === 'strong') return 'skip'; });
    assert.deepEqual(types, ['root', 'heading', 'text', 'strong']);
  });
});

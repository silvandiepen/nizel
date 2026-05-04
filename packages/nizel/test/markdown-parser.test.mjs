import assert from 'node:assert/strict';
import { test } from 'vitest';
import { parseMarkdown } from '../dist/parse.js';
import { useNizel } from '../dist/index.js';

const options = {
  anchors: true,
  autolinks: true,
  blocks: {},
  safe: true,
};

test('block parser creates expected nodes for core Markdown blocks', () => {
  const ast = parseMarkdown(`# One

Paragraph line
continued.

> Quote

- [x] Done
- [ ] Todo

2. Second
3. Third

---

\`\`\`ts filename="demo.ts" {2-3}
const value = true;
console.log(value);
\`\`\``, options);

  assert.deepEqual(
    ast.children.map((node) => node.type),
    ['heading', 'paragraph', 'blockquote', 'list', 'list', 'thematicBreak', 'code'],
  );
  assert.equal(ast.children[0].id, 'one');
  assert.equal(ast.children[1].children.map((node) => node.value ?? '').join(''), 'Paragraph line continued.');
  assert.equal(ast.children[3].children[0].checked, true);
  assert.equal(ast.children[3].children[1].checked, false);
  assert.equal(ast.children[4].ordered, true);
  assert.equal(ast.children[4].start, 2);
  assert.equal(ast.children[6].filename, 'demo.ts');
  assert.deepEqual(ast.children[6].highlightLines, [2, 3]);
});

test('inline parser handles emphasis, strong, delete, code, links, images, urls, and email', async () => {
  const result = await useNizel()(
    'Text *em* **strong** ~~old~~ `code` [site](https://example.com "Title") ![alt](/img.png "Image") https://nizel.dev. mail@example.com',
  );

  assert.match(result.html, /<em>em<\/em>/);
  assert.match(result.html, /<strong>strong<\/strong>/);
  assert.match(result.html, /<del>old<\/del>/);
  assert.match(result.html, /<code>code<\/code>/);
  assert.match(result.html, /<a href="https:\/\/example.com" title="Title">site<\/a>/);
  assert.match(result.html, /<img src="\/img.png" alt="alt" title="Image" \/>/);
  assert.match(result.html, /<a href="https:\/\/nizel.dev">https:\/\/nizel.dev<\/a>\./);
  assert.match(result.html, /<a href="mailto:mail@example.com">mail@example.com<\/a>/);
  assert.deepEqual(
    result.links.map((link) => link.href),
    ['https://example.com', 'https://nizel.dev', 'mailto:mail@example.com'],
  );
  assert.equal(result.images[0].src, '/img.png');
});

test('autolinks are disabled when configured and never apply inside code spans or blocks', async () => {
  const disabled = await useNizel({ autolinks: false }).html('Visit https://example.com');
  const enabled = await useNizel().html('`https://example.com`\n\n```txt\nhttps://example.com\n```');

  assert.equal(disabled, '<p>Visit https://example.com</p>');
  assert.match(enabled, /<p><code>https:\/\/example.com<\/code><\/p>/);
  assert.match(enabled, /<pre><code class="language-txt">https:\/\/example.com\n<\/code><\/pre>/);
});

test('duplicate headings get stable unique slugs and anchors can be disabled', async () => {
  const result = await useNizel()('# Intro\n\n# Intro\n\n## Intro');
  const noAnchors = await useNizel({ anchors: false }).html('# Intro');

  assert.deepEqual(
    result.headings.map((heading) => heading.id),
    ['intro', 'intro-2', 'intro-3'],
  );
  assert.equal(noAnchors, '<h1>Intro</h1>');
});

test('table alignment and inline table content render predictably', async () => {
  const html = await useNizel().html(`| Left | Center | Right |
| :--- | :----: | ----: |
| *a* | **b** | c |`);

  assert.match(html, /<th align="left">Left<\/th>/);
  assert.match(html, /<th align="center">Center<\/th>/);
  assert.match(html, /<th align="right">Right<\/th>/);
  assert.match(html, /<td align="left"><em>a<\/em><\/td>/);
  assert.match(html, /<td align="center"><strong>b<\/strong><\/td>/);
});

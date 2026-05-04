import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel, defineBlock, defineNizelPlugin } from '../dist/index.js';
import { defaultFilters } from '../dist/defaults.js';
import { extractFrontmatter } from '../dist/frontmatter.js';

// 1. variables option (alias for data)
test('variables option works as alias for data', async () => {
  const nizel = useNizel();
  const result = await nizel('# Hello {{ name }}', { variables: { name: 'World' } });
  assert.match(result.html, /<h1 id="hello-world">Hello World<\/h1>/);
});

// 2. slugStyle classic
test('slugStyle classic uses simpler slugification', async () => {
  const nizel = useNizel({ slugStyle: 'classic' });
  const result = await nizel('# Hello World!');
  assert.match(result.html, /id="hello-world"/);
});

// 3. preset as top-level option
test('preset can be passed as a top-level constructor option', async () => {
  const nizel = useNizel({ preset: 'minimal' });
  const result = await nizel('# Hello');
  assert.equal(result.toc.length, 0);
  assert.match(result.html, /\{\{|\}\}/); // minimal keeps template literals if unresolved
});

// 4. .parse() method
test('.parse() returns the AST without rendering', async () => {
  const nizel = useNizel();
  const ast = await nizel.parse('# Hello\n\nParagraph');
  assert.equal(ast.type, 'root');
  assert.equal(ast.children[0].type, 'heading');
  assert.equal(ast.children[0].depth, 1);
  assert.equal(ast.children[1].type, 'paragraph');
});

// 5. .render() method
test('.render() renders an AST to HTML', async () => {
  const nizel = useNizel();
  const ast = await nizel.parse('# Hello');
  const html = nizel.render(ast);
  assert.match(html, /<h1[^>]*>Hello<\/h1>/);
});

// 6. Element tag property
test('element tag property replaces the HTML tag name', async () => {
  const nizel = useNizel({
    elements: { strong: { tag: 'b' }, em: { tag: 'i' } },
  });
  const result = await nizel('**bold** and *italic*');
  assert.match(result.html, /<b>bold<\/b>/);
  assert.match(result.html, /<i>italic<\/i>/);
});

// 7. Element attr property (alias for attrs)
test('element attr property works as alias for attrs', async () => {
  const nizel = useNizel({
    elements: { a: { attr: { rel: 'noopener' } } },
  });
  const result = await nizel('[link](https://example.com)');
  assert.match(result.html, /rel="noopener"/);
});

// 8. Element shorthand attrs (bare properties)
test('element shorthand attrs work without attr wrapper', async () => {
  const nizel = useNizel({
    elements: { a: { target: '_blank', rel: 'noopener noreferrer' } },
  });
  const result = await nizel('[link](https://example.com)');
  assert.match(result.html, /target="_blank"/);
  assert.match(result.html, /rel="noopener noreferrer"/);
});

// 9. br customizable via elements
test('br element can be customized via element rules', async () => {
  // Hard break via two spaces + newline
  const nizel = useNizel({ elements: { br: { class: 'line-break' } } });
  const result = await nizel('line1  \nline2');
  assert.match(result.html, /class="line-break"/);
});

// 10. capitalize filter
test('capitalize filter capitalizes the first letter', () => {
  assert.equal(defaultFilters.capitalize('hello world'), 'Hello world');
});

// 11. header filter produces Title-Case with hyphens
test('header filter produces Title-Case hyphenated output', () => {
  assert.equal(defaultFilters.header('hello world'), 'Hello-World');
});

// 12. dot, path, sentence filters
test('dot, path, and sentence filters produce expected output', () => {
  assert.equal(defaultFilters.dot('hello world'), 'hello.world');
  assert.equal(defaultFilters.path('hello world'), 'hello/world');
  assert.equal(defaultFilters.sentence('hello world'), 'Hello world');
});

// 13. format number filter
test('format filter supports number formatting', () => {
  assert.equal(defaultFilters.format(1234.5, 'number', '0.00'), '1,234.50');
  assert.equal(defaultFilters.format(42, 'number', '0.000'), '42.000');
});

// 14. afterRender hook
test('afterRender hook receives and can modify HTML', async () => {
  const plugin = {
    name: 'wrap-tables',
    hooks: {
      afterRender(html, options) {
        return html.replace(/<table>/g, '<div class="table-wrap"><table>');
      },
    },
  };
  const nizel = useNizel({ plugins: [plugin] });
  const result = await nizel('| A | B |\n|---|---|\n| 1 | 2 |');
  assert.match(result.html, /class="table-wrap"/);
});

// 15. Plugin hooks receive options as second arg
test('plugin hooks receive resolved options as second argument', async () => {
  let receivedOptions = null;
  const plugin = {
    name: 'spy',
    hooks: {
      beforeParse(markdown, options) {
        receivedOptions = options;
        return markdown;
      },
    },
  };
  const nizel = useNizel({ plugins: [plugin], anchors: true });
  await nizel('# Test');
  assert.ok(receivedOptions);
  assert.equal(receivedOptions.anchors, true);
});

// 16. Safety: event handler stripping
test('safe mode strips event handler attributes from elements', async () => {
  const nizel = useNizel({ safe: true });
  const result = await nizel('[link](https://example.com)', {
    elements: { a: { onclick: 'alert(1)', class: 'link' } },
  });
  assert.doesNotMatch(result.html, /onclick/);
  assert.match(result.html, /class="link"/);
});

// 17. Safety: javascript: URL stripping
test('safe mode strips javascript: URLs from links', async () => {
  const nizel = useNizel({ safe: true });
  const ast = await nizel.parse('[click](javascript:alert(1))');
  const html = nizel.render(ast);
  assert.doesNotMatch(html, /javascript:/);
});

// 18. Frontmatter YAML arrays
test('frontmatter parses YAML arrays with dash syntax', () => {
  const result = extractFrontmatter('---\ntitle: Test\ntags:\n  - markdown\n  - parser\n---\nContent.');
  assert.deepEqual(result.frontmatter.title, 'Test');
  assert.deepEqual(result.frontmatter.tags, ['markdown', 'parser']);
  assert.equal(result.markdown, 'Content.');
});

// 19. TOC entries have level/slug aliases
test('TOC entries provide level and slug as aliases for depth and id', async () => {
  const nizel = useNizel({ toc: true, anchors: true });
  const result = await nizel('# Title\n## Section');
  assert.equal(result.toc[0].depth, 1);
  assert.equal(result.toc[0].level, 1);
  assert.equal(result.toc[0].id, 'title');
  assert.equal(result.toc[0].slug, 'title');
  assert.equal(result.toc[1].depth, 2);
  assert.equal(result.toc[1].level, 2);
  assert.equal(result.toc[1].slug, 'section');
});

// 20. blog preset
test('blog preset enables frontmatter, toc, and anchors', async () => {
  const nizel = useNizel.preset('blog');
  const result = await nizel('# Title\n## Section');
  assert.equal(result.toc.length, 2);
  assert.match(result.html, /id="title"/);
});

// 21. email preset with table attrs
test('email preset includes table presentation attributes', async () => {
  const nizel = useNizel.preset('email');
  const result = await nizel('| A | B |\n|---|---|\n| 1 | 2 |');
  assert.match(result.html, /role="presentation"/);
  assert.match(result.html, /cellpadding="0"/);
  assert.doesNotMatch(result.html, /target=/); // no target on links
});

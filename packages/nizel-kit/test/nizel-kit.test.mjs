import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  createPlugins,
  defaultEnabledPlugins,
  markdownToHtml,
  normalizeEnabledPlugins,
  supportedPlugins,
  useNizelKit,
} from '../dist/index.js';

test('exposes a native-app friendly plugin registry', () => {
  const ids = supportedPlugins.map((plugin) => plugin.id);
  assert.deepEqual(ids, [
    'sanitize',
    'autolink',
    'gfm',
    'emoji',
    'abbr',
    'citations',
    'alert',
    'details',
    'deflist',
    'frontmatter-ui',
    'heading-anchors',
    'hidden-comments',
    'media',
    'toc',
    'task-list',
    'footnotes',
    'math',
    'typography',
    'diagrams',
    'shiki',
    'code-copy',
  ]);
  assert.deepEqual(defaultEnabledPlugins(), ['sanitize', 'autolink']);
});

test('creates plugins from enabled plugin ids', () => {
  const plugins = createPlugins(['alert', 'hidden-comments', 'math', 'typography'], {
    'hidden-comments': { mode: 'small' },
  });
  assert.deepEqual(plugins.map((plugin) => plugin.name), ['alert', 'hidden-comments', 'math', 'typography']);
});

test('keeps composable code plugins enabled together', () => {
  assert.deepEqual(
    normalizeEnabledPlugins(['alert', 'diagrams', 'shiki', 'code-copy']),
    ['alert', 'diagrams', 'shiki', 'code-copy'],
  );
});

test('renders selected extension plugins through NizelKit', async () => {
  const html = await markdownToHtml('[[toc]]\n\n## A\n\n> [!NOTE]\n> Hi\n\n==mark== and $E=mc^2$', {
    enabledPlugins: ['alert', 'typography', 'math', 'toc'],
  });

  assert.match(html, /class="alert alert--note"/);
  assert.match(html, /<mark>mark<\/mark>/);
  assert.match(html, /class="math math-inline"/);
  assert.match(html, /<nav class="toc"/);
});

test('converts selected plugin HTML back through NizelKit', async () => {
  const html = await markdownToHtml('Visible <!-- note --> text', {
    enabledPlugins: ['hidden-comments'],
  });
  const processor = useNizelKit({ enabledPlugins: ['hidden-comments'] });
  assert.equal(processor.htmlToMarkdown(html), 'Visible <!-- note --> text');
});

test('expands preset plugin ids', () => {
  assert.deepEqual(createPlugins(['gfm']).map((plugin) => plugin.name), ['autolink', 'alert', 'task-list']);
});

test('renders with every supported plugin enabled', async () => {
  const html = await markdownToHtml([
    '[[toc]]',
    '',
    '# Title',
    '',
    '## Section',
    '',
    '> [!NOTE]',
    '> Hi :rocket:',
    '',
    '*[HTML]: HyperText Markup Language',
    '',
    'HTML, ==mark==, $E=mc^2$, [@doe], and a footnote.[^a]',
    '',
    '[@doe]: Doe, Example.',
    '[^a]: Footnote text.',
  ].join('\n'), {
    enabledPlugins: supportedPlugins.map((plugin) => plugin.id),
  });

  assert.match(html, /<nav class="toc"/);
  assert.match(html, /class="alert alert--note"/);
  assert.match(html, /🚀/u);
  assert.match(html, /<abbr title="HyperText Markup Language">HTML<\/abbr>/);
  assert.match(html, /class="math math-inline"/);
  assert.match(html, /class="citation"/);
  assert.match(html, /class="footnote-ref"/);
});

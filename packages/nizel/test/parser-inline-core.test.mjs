import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  parseInline,
  parseInlineWithState,
  scanBalancedInlineLinks,
  stripInlineMarkdown,
} from '../dist/parse/inline.js';

const options = { autolinks: true, safe: true };

const referenceState = {
  references: new Map([
    ['ref', { href: '/docs', title: 'Docs' }],
    ['img', { href: '/image.png', title: 'Image' }],
  ]),
};

test('parseInline parses text, emphasis, code, and autolinks without reference state', () => {
  assert.deepEqual(parseInline('A **strong** `code` https://example.com.', options), [
    { type: 'text', value: 'A ' },
    { type: 'strong', children: [{ type: 'text', value: 'strong' }] },
    { type: 'text', value: ' ' },
    { type: 'inlineCode', code: 'code' },
    { type: 'text', value: ' ' },
    {
      type: 'link',
      href: 'https://example.com',
      external: true,
      children: [{ type: 'text', value: 'https://example.com' }],
    },
    { type: 'text', value: '.' },
  ]);
});

test('parseInlineWithState resolves full reference links and images', () => {
  assert.deepEqual(parseInlineWithState('[Guide][ref] ![Diagram][img]', options, referenceState), [
    {
      type: 'link',
      href: '/docs',
      title: 'Docs',
      external: false,
      children: [{ type: 'text', value: 'Guide' }],
    },
    { type: 'text', value: ' ' },
    {
      type: 'image',
      alt: 'Diagram',
      src: '/image.png',
      title: 'Image',
    },
  ]);
});

test('scanBalancedInlineLinks parses nested labels before regex tokenization', () => {
  const nodes = scanBalancedInlineLinks('See [a [b]](/url) now', options, referenceState);

  assert.equal(nodes?.[0]?.type, 'text');
  assert.equal(nodes?.[1]?.type, 'link');
  assert.equal(nodes?.[1]?.href, '/url');
  assert.deepEqual(nodes?.[1]?.children, [{ type: 'text', value: 'a [b]' }]);
  assert.deepEqual(nodes?.at(-1), { type: 'text', value: ' now' });
});

test('scanBalancedInlineLinks leaves sources without balanced links to the regex tokenizer', () => {
  assert.equal(scanBalancedInlineLinks('No [closed link', options, referenceState), null);
});

test('stripInlineMarkdown turns inline Markdown into plain text', () => {
  assert.equal(stripInlineMarkdown('**Read** [`code`](/docs) ![Alt *text*](/img.png)', options), 'Read code Alt text');
});

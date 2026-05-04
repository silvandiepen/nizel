import assert from 'node:assert/strict';
import { test } from 'vitest';
import { extractFrontmatter } from '../dist/frontmatter.js';
import { renderTemplate } from '../dist/template.js';
import { useNizel } from '../dist/index.js';

test('frontmatter parses flat metadata values and removes the block', () => {
  const result = extractFrontmatter(`---
title: "Hello"
draft: false
count: 3
empty: null
---

# Body`);

  assert.deepEqual(result.frontmatter, {
    title: 'Hello',
    draft: false,
    count: 3,
    empty: null,
  });
  assert.equal(result.markdown, '# Body');
});

test('frontmatter is ignored when no complete opening and closing fence exists', () => {
  assert.deepEqual(extractFrontmatter('# Body').frontmatter, {});
  assert.deepEqual(extractFrontmatter('---\ntitle: Missing close').frontmatter, {});
});

test('frontmatter templates are resolved before body templates use meta', async () => {
  const result = await useNizel()(`---
title: "{{ product.name | title }}"
slug: "{{ product.name | kebab }}"
---

# {{ meta.title }}

{{ meta.slug }}`, {
    data: {
      product: { name: 'hello nizel' },
    },
  });

  assert.equal(result.meta.title, 'Hello Nizel');
  assert.equal(result.meta.slug, 'hello-nizel');
  assert.match(result.html, /<h1 id="hello-nizel">Hello Nizel<\/h1>/);
  assert.match(result.html, /<p>hello-nizel<\/p>/);
});

test('template escaping, raw output, missing modes, and filter args are explicit', () => {
  const data = {
    html: '<span>unsafe</span>',
    amount: 12.5,
    user: { name: 'Sil' },
  };
  const filters = {
    suffix: (value, suffix) => `${value}${suffix}`,
    format: (value, kind, currency) =>
      kind === 'currency' ? `${currency} ${Number(value).toFixed(2)}` : String(value),
  };

  assert.equal(
    renderTemplate('{{ user.name | suffix("!") }}', data, { filters }),
    'Sil!',
  );
  assert.equal(renderTemplate('{{ html }}', data, {}), '&lt;span&gt;unsafe&lt;/span&gt;');
  assert.equal(renderTemplate('{{{ html }}}', data, { raw: false }), '{{{ html }}}');
  assert.equal(renderTemplate('{{{ html }}}', data, { raw: true }), '<span>unsafe</span>');
  assert.equal(renderTemplate('{{ missing }}', data, { missing: 'empty' }), '');
  assert.equal(renderTemplate('{{ amount | format("currency", "EUR") }}', data, { filters }), 'EUR 12.50');
  assert.throws(
    () => renderTemplate('{{ missing }}', data, { missing: 'error' }),
    /Missing template value: missing/,
  );
});

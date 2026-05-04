import assert from 'node:assert/strict';
import { test } from 'vitest';
import { useNizel } from '../dist/index.js';

test('result object exposes selected output and collected content consistently', async () => {
  const nizel = useNizel({ output: 'text' });
  const result = await nizel(`# Title

Intro paragraph with [a link](/docs).

![Logo](/logo.svg)

\`\`\`txt
code words
\`\`\``);

  assert.equal(result.result, result.text);
  assert.equal(result.title, 'Title');
  assert.equal(result.headings[0].text, 'Title');
  assert.equal(result.toc[0].id, 'title');
  assert.equal(result.links[0].href, '/docs');
  assert.equal(result.images[0].alt, 'Logo');
  assert.match(result.text, /Intro paragraph with a link/);
  assert.match(result.text, /code words/);
  assert.equal(result.readingTime.minutes, 1);
  assert.ok(result.excerpt.length <= 160);
});

test('helper methods preserve configured processor behavior', async () => {
  const nizel = useNizel({
    elements: {
      p: { class: 'copy' },
    },
  });

  assert.equal(await nizel.text('Hello **world**'), 'Hello world');
  assert.equal((await nizel.ast('# Title')).children[0].type, 'heading');
  assert.deepEqual(await nizel.meta('---\ntitle: Meta\n---\n# Body'), { title: 'Meta' });
  assert.match(await nizel.html('Hello'), /class="copy"/);
});

test('safe rendering escapes text, attributes, code, raw html, and element-provided attributes', async () => {
  const html = await useNizel({
    elements: {
      a: { attrs: { title: '"quoted"', 'data-x': '<x>' } },
      p: { class: 'copy<script>' },
    },
  }).html(`Hello <strong>raw</strong>

[bad](/x?value="<script>")

\`\`\`html
<script>alert("x")</script>
\`\`\``);

  assert.match(html, /Hello &lt;strong&gt;raw&lt;\/strong&gt;/);
  assert.match(html, /href="\/x\?value=%22%3Cscript%3E%22"/);
  assert.match(html, /title="&quot;quoted&quot;"/);
  assert.match(html, /data-x="&lt;x&gt;"/);
  assert.match(html, /class="copy&lt;script&gt;"/);
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
});

test('safe false records raw html nodes while default safe mode treats raw html as text', async () => {
  const unsafe = await useNizel({ safe: false })('<section>Raw</section>');
  const safe = await useNizel()('<section>Raw</section>');

  assert.equal(unsafe.ast.children[0].type, 'html');
  assert.equal(safe.ast.children[0].type, 'paragraph');
  assert.equal(unsafe.html, '<section>Raw</section>');
  assert.equal(safe.html, '<p>&lt;section&gt;Raw&lt;/section&gt;</p>');
});

test('presets provide documented option bundles', async () => {
  const minimal = await useNizel.preset('minimal')('# {{ title }}', {
    data: { title: 'Ignored' },
  });
  const docs = await useNizel.preset('docs').html('## Section\n\n`code`');
  const email = await useNizel.preset('email').html('Visit https://example.com');

  assert.equal(minimal.html, '<h1>{{ title }}</h1>');
  assert.equal(minimal.toc.length, 0);
  assert.match(docs, /class="nizel-docs-heading"/);
  assert.match(docs, /class="nizel-code"/);
  assert.doesNotMatch(email, /target=/);
});

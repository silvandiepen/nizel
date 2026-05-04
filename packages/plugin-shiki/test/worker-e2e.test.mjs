import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { test } from 'vitest';

const workerEntrypoint = `
  import { useNizel } from 'nizel';
  import { shikiPlugin } from 'nizel-plugin-shiki';
  import { createJavaScriptShikiHighlighter } from 'nizel-plugin-shiki/javascript';

  const highlighter = await createJavaScriptShikiHighlighter({
    themes: ['github-dark'],
    langs: ['javascript'],
    defaultTheme: 'github-dark',
    defaultLang: 'text',
  });

  const nizel = useNizel({
    plugins: [shikiPlugin({ highlighter })],
  });

  export default {
    async fetch() {
      const html = await nizel.html('# Worker\\n\\n\\\`\\\`\\\`js\\nconst value = true;\\n\\\`\\\`\\\`');
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    },
  };
`;

test('e2e: renders highlighted Markdown in a Worker without bundling Shiki WASM', async () => {
  const result = await build({
    stdin: {
      contents: workerEntrypoint,
      loader: 'js',
      resolveDir: process.cwd(),
    },
    bundle: true,
    conditions: ['worker', 'browser', 'import', 'default'],
    format: 'esm',
    mainFields: ['module', 'main'],
    platform: 'browser',
    target: 'es2022',
    write: false,
  });
  const bundledWorker = result.outputFiles[0].text;

  assert.doesNotMatch(bundledWorker, /onig\.wasm|shiki\/wasm|engine-oniguruma|@shikijs\/engine-oniguruma/);
  assert.match(bundledWorker, /createJavaScriptRegexEngine/);

  const miniflare = new Miniflare({
    compatibilityDate: '2026-05-04',
    modules: true,
    script: bundledWorker,
  });

  try {
    const response = await miniflare.dispatchFetch('https://example.com/');
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.match(html, /<h1 id="worker">Worker<\/h1>/);
    assert.match(html, /<pre class="shiki github-dark"/);
    assert.match(html, /const/);
    assert.doesNotMatch(html, /language-js/);
  } finally {
    await miniflare.dispose();
  }
});

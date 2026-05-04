# nizel-plugin-shiki

Code syntax highlighting integration for [Nizel](https://npmjs.com/package/nizel).

Accepts a Worker-compatible highlighter function and passes code blocks through it. Falls back to plain `<pre><code>` when no highlighter is provided.

## Install

```bash
npm install nizel-plugin-shiki
```

Install Shiki separately when you want Shiki-powered output:

```bash
npm install shiki
```

## Usage

```js
import { useNizel } from 'nizel';
import { shikiPlugin } from 'nizel-plugin-shiki';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'typescript'],
});

const processor = useNizel({
  plugins: [
    shikiPlugin({
      highlighter(code, { lang, theme }) {
        return highlighter.codeToHtml(code, { lang, theme: theme || 'github-dark' });
      },
      theme: 'github-dark',
    }),
  ],
});

const result = processor.process('```js\nconsole.log("hello")\n```');
// Highlighted HTML from Shiki
```

## Worker and no-WASM usage

Use the `nizel-plugin-shiki/javascript` entrypoint when Shiki must run without the Oniguruma WASM engine, such as in Worker bundles.

```js
import { useNizel } from 'nizel';
import { shikiPlugin } from 'nizel-plugin-shiki';
import { createJavaScriptShikiHighlighter } from 'nizel-plugin-shiki/javascript';

const highlighter = await createJavaScriptShikiHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'typescript'],
  defaultTheme: 'github-dark',
  defaultLang: 'text',
});

const processor = useNizel({
  plugins: [shikiPlugin({ highlighter })],
});
```

The root `nizel-plugin-shiki` entrypoint does not import Shiki. The `/javascript` entrypoint imports Shiki with `shiki/engine/javascript`, so bundlers can select the JavaScript regex engine intentionally.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `highlighter` | `function` | — | Function receiving `(code, { lang, theme, meta, filename, highlightLines })`, returns HTML string |
| `theme` | `string` | — | Default theme name passed to the highlighter |
| `mode` | `'blocks' \| 'inline'` | `'blocks'` | Set to `'inline'` to skip highlighting (plain fallback) |

## License

MIT

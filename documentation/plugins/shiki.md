---
title: Shiki
description: Worker-compatible syntax highlighting integration for Nizel.
icon: ui/file-code
order: 6
---

# Shiki

`nizel-plugin-shiki` lets Nizel delegate fenced code block rendering to a Worker-compatible highlighter function.

The plugin does not bundle Shiki directly. You provide a highlighter so the same package can run in Node, Workers, and other runtimes.

## Install

```bash
npm install nizel-plugin-shiki
```

Install Shiki separately when you want Shiki-powered output:

```bash
npm install shiki
```

## Usage

```ts
import { useNizel } from 'nizel';
import { shikiPlugin } from 'nizel-plugin-shiki';
import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'typescript'],
});

const nizel = useNizel({
  plugins: [
    shikiPlugin({
      theme: 'github-dark',
      highlighter(code, { lang, theme }) {
        return highlighter.codeToHtml(code, {
          lang: lang || 'text',
          theme: theme || 'github-dark',
        });
      },
    }),
  ],
});
```

## Worker and no-WASM usage

Use the `nizel-plugin-shiki/javascript` entrypoint when Shiki must run with its JavaScript regex engine instead of the default Oniguruma WASM engine.

```ts
import { useNizel } from 'nizel';
import { shikiPlugin } from 'nizel-plugin-shiki';
import { createJavaScriptShikiHighlighter } from 'nizel-plugin-shiki/javascript';

const highlighter = await createJavaScriptShikiHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'typescript'],
  defaultTheme: 'github-dark',
  defaultLang: 'text',
});

const nizel = useNizel({
  plugins: [shikiPlugin({ highlighter })],
});
```

The root `nizel-plugin-shiki` entrypoint does not import Shiki. The `/javascript` entrypoint imports Shiki and `shiki/engine/javascript`, which makes the no-WASM choice explicit in your bundle.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `highlighter` | `(code, input) => string \| undefined` | - | Function that returns highlighted HTML. |
| `theme` | `string` | - | Theme name passed to the highlighter input. |
| `mode` | `'blocks' \| 'inline'` | `'blocks'` | Set to `'inline'` to skip highlighting and render the fallback. |

The highlighter receives this input object:

```ts
type ShikiHighlighterInput = {
  lang?: string;
  theme?: string;
  meta?: string;
  filename?: string;
  highlightLines?: number[];
};
```

## Fallback

When no highlighter returns HTML, the plugin renders escaped code with the language class preserved.

```html
<pre><code class="language-js">console.log("hello")</code></pre>
```

---
title: API Reference
icon: ui/file-code
order: 2
---

# API Reference

## `useNizel(options?)`

Creates a Nizel processor instance.

```ts
import { useNizel } from 'nizel';

const nizel = useNizel(options);
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `output` | `'html' \| 'ast' \| 'text'` | `'html'` | Main output format |
| `frontmatter` | `boolean` | `true` | Extract YAML frontmatter |
| `toc` | `boolean` | `true` | Generate table of contents |
| `anchors` | `boolean` | `true` | Add id attributes to headings |
| `slugStyle` | `'github' \| 'classic'` | `'github'` | Slug generation style |
| `elements` | `object` | `{}` | Customize HTML element output |
| `plugins` | `array` | `[]` | Plugin instances |
| `preset` | `string` | `undefined` | Built-in preset name |
| `safe` | `boolean` | `true` | Sanitize output |
| `variables` | `object` | `{}` | Template variables |
| `autolinks` | `boolean \| object` | `{ enabled: true }` | Auto-link URLs |

### Usage

```ts
const nizel = useNizel({
  output: 'html',
  frontmatter: true,
  toc: true,
  anchors: true,
});
```

## `nizel(markdown, runtimeOptions?)`

Parse Markdown and return a structured result.

```ts
const data = await nizel(markdown, runtimeOptions);
```

### Parameters

- **markdown** `string` — The Markdown source text.
- **runtimeOptions** `object` — Optional per-call overrides.

### Runtime Options

| Option | Type | Description |
|---|---|---|
| `variables` | `object` | Template variables for this call |

### Return Value

Returns a `NizelResult` object. See [Result Object](/guides/result/index.html).

## `useNizel().parse(markdown)`

Returns the raw AST without rendering. This is an async method.

```ts
const ast = await nizel.parse('# Hello');
```

## `useNizel().render(ast)`

Renders an AST to HTML.

```ts
const html = nizel.render(ast);
```

## `htmlToMarkdown(html, options?)`

Converts semantic HTML into Markdown.

```ts
import { htmlToMarkdown } from 'nizel';

const markdown = htmlToMarkdown('<h1>Intro</h1><p>Hello <strong>world</strong>.</p>');
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `unsupported` | `'preserve' \| 'drop'` | `'preserve'` | Preserve HTML that Markdown cannot represent, or drop unsupported markup and keep readable text where possible. |

See [HTML to Markdown](/guides/html-to-markdown/index.html) for conversion rules and unsupported HTML policy.

## Browser API

Browser-specific helpers are available from `nizel/browser`.

```ts
import {
  htmlToMarkdown,
  markdownToHtml,
  mountMarkdown,
  selectionToMarkdown,
  useBrowserNizel,
} from 'nizel/browser';

const html = await markdownToHtml('# Preview');
const markdown = htmlToMarkdown(document.querySelector('article')!);
const selected = selectionToMarkdown();

await mountMarkdown('#preview', '# Preview');

const nizel = useBrowserNizel();
await nizel.mount('#preview', '# Preview');
```

The browser entry also exports the core API (`useNizel`, `defineNizelPlugin`, `defineBlock`, and types), so it can be used as the single Nizel entry in browser bundles.

For embedded webviews such as `WKWebView`, the package build emits explicit browser artifacts:

```txt
dist/browser/nizel.js       ESM bundle
dist/browser/nizel.iife.js  IIFE bundle exposing globalThis.Nizel
```

Use `dist/browser/nizel.iife.js` when loading scripts directly into a webview, then call `Nizel.markdownToHtml()`, `Nizel.htmlToMarkdown()`, or `Nizel.useBrowserNizel()` from the preview bridge.

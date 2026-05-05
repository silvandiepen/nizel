# API

## `useNizel(options?)`

Creates a Nizel processor.

```ts
import { useNizel } from 'nizel';

const nizel = useNizel({
  output: 'html',
  frontmatter: true,
  toc: true,
  anchors: true,
});
```

## `nizel(markdown, runtimeOptions?)`

Processes Markdown and returns a full `NizelResult` object.

```ts
const { result, html, meta, toc } = await nizel(markdown);
```

Runtime options are merged on top of the processor options for that call only.

```ts
await nizel(markdown, {
  data: {
    title: 'Runtime title',
  },
});
```

## Helper methods

Nizel should expose common output helpers for simpler usage.

```ts
await nizel.html(markdown);
await nizel.text(markdown);
await nizel.ast(markdown);
await nizel.meta(markdown);
```

These helpers should use the same configured processor, plugins, filters, blocks, elements, and safety rules.

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

See [HTML to Markdown](./html-to-markdown.md) for conversion rules and unsupported HTML policy.

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

## Options

```ts
type NizelOptions<TMeta = Record<string, unknown>> = {
  output?: 'html' | 'text' | 'ast';

  frontmatter?: boolean | NizelFrontmatterOptions;
  template?: boolean | NizelTemplateOptions;
  toc?: boolean | NizelTocOptions;
  anchors?: boolean | NizelAnchorOptions;
  safe?: boolean | NizelSafetyOptions;
  unwrapStandaloneImages?: boolean;

  elements?: NizelElementRules;
  blocks?: NizelBlockMap;
  inline?: NizelInlineMap;
  transforms?: NizelTransform[];
  plugins?: NizelPlugin[];

  data?: Record<string, unknown>;
};
```

## Merge order

Configuration should be merged in this order:

```txt
defaults
→ preset options
→ plugin options, in order
→ useNizel options
→ runtime options
```

Later layers override earlier layers.

## Default behavior

The default processor should be useful without configuration.

```ts
const nizel = useNizel();
```

Default behavior should include:

- Markdown to HTML
- frontmatter extraction
- safe output
- variable interpolation enabled
- built-in filters from `@sil/format` and `@sil/case`
- heading collection
- TOC generation
- link and image extraction
- plain text extraction
- reading time

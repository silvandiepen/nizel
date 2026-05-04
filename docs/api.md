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

## Options

```ts
type NizelOptions<TMeta = Record<string, unknown>> = {
  output?: 'html' | 'text' | 'ast';

  frontmatter?: boolean | NizelFrontmatterOptions;
  template?: boolean | NizelTemplateOptions;
  toc?: boolean | NizelTocOptions;
  anchors?: boolean | NizelAnchorOptions;
  safe?: boolean | NizelSafetyOptions;

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

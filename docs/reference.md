# Nizel Reference

This is the end-user reference for the current Nizel package.

Nizel turns Markdown into structured content:

- HTML
- plain text
- normalized AST
- frontmatter metadata
- table of contents
- headings
- links
- images
- excerpt
- reading-time data

## Install

```bash
npm install nizel
```

## Basic Usage

```ts
import { useNizel } from 'nizel';

const nizel = useNizel();

const result = await nizel(`
---
title: Hello World
---

# {{ meta.title }}

Welcome to **Nizel**.
`);

console.log(result.html);
console.log(result.meta.title);
console.log(result.toc);
```

## Main API

### `useNizel(options?)`

Creates a configured processor.

```ts
const nizel = useNizel({
  output: 'html',
  toc: true,
  anchors: true,
});
```

### `nizel(markdown, runtimeOptions?)`

Processes Markdown and returns a full result object.

```ts
const result = await nizel(markdown, {
  data: {
    product: { name: 'Nizel' },
  },
});
```

Runtime options are merged on top of processor options for that call only.

### Helper Methods

```ts
await nizel.html(markdown);
await nizel.text(markdown);
await nizel.ast(markdown);
await nizel.meta(markdown);
```

Helpers use the same configured processor, plugins, filters, elements, blocks, and safety rules.

## Result Object

```ts
type NizelResult = {
  result: unknown;

  html: string;
  text: string;
  ast: NizelRootNode;

  meta: Record<string, unknown>;
  frontmatter: Record<string, unknown>;

  title?: string;
  description?: string;
  excerpt?: string;

  toc: NizelTocItem[];
  headings: NizelHeading[];
  links: NizelLink[];
  images: NizelImage[];

  readingTime: {
    words: number;
    minutes: number;
  };
};
```

`result` is selected by `options.output`:

- `html`: `result === html`
- `text`: `result === text`
- `ast`: `result === ast`

## Options

```ts
type NizelOptions = {
  output?: 'html' | 'text' | 'ast';

  frontmatter?: boolean;
  template?: boolean | NizelTemplateOptions;
  toc?: boolean;
  anchors?: boolean;
  autolinks?: boolean | NizelAutolinkOptions;
  safe?: boolean;
  unwrapStandaloneImages?: boolean;

  elements?: NizelElementRules;
  blocks?: NizelBlockMap;
  transforms?: NizelTransform[];
  plugins?: NizelPlugin[];

  data?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};
```

### `output`

Controls the main `result` value.

Default: `html`

```ts
const nizel = useNizel({ output: 'text' });
const result = await nizel('# Hello');

result.result === result.text;
```

### `frontmatter`

Enables or disables leading frontmatter extraction.

Default: `true`

```md
---
title: Hello
draft: false
count: 3
---

# Hello
```

Supported values are flat scalar values:

- strings
- numbers
- booleans
- `null`

Frontmatter is exposed as both `meta` and `frontmatter`.

### `template`

Enables or disables template replacement.

Default:

```ts
{
  missing: 'keep',
  raw: false,
  filters: defaultFilters
}
```

```ts
type NizelTemplateOptions = {
  missing?: 'keep' | 'empty' | 'error';
  raw?: boolean;
  filters?: Record<string, NizelTemplateFilter>;
};
```

### `toc`

Enables or disables `toc` output.

Default: `true`

### `anchors`

Adds stable IDs to headings.

Default: `true`

Duplicate headings get suffixes:

```md
# Intro
# Intro
```

produces `intro` and `intro-2`.

### `autolinks`

Converts URLs and email addresses into links.

Default:

```ts
{ enabled: true }
```

```ts
const nizel = useNizel({
  autolinks: {
    enabled: true,
    target: '_blank',
    rel: 'noopener noreferrer',
  },
});
```

Autolinks are not applied inside code blocks, inline code, or existing Markdown links.

### `safe`

Controls raw HTML parsing.

Default: `true`

In safe mode, raw HTML is treated as text and escaped during rendering.

### `unwrapStandaloneImages`

Renders image-only paragraphs as a bare `<img />` element.

Default: `false`

By default, Nizel follows CommonMark and renders a standalone image as inline content inside a paragraph:

```html
<p><img src="/image.png" alt="Alt" /></p>
```

Enable unwrapping when the surrounding paragraph is not wanted:

```ts
const nizel = useNizel({ unwrapStandaloneImages: true });
```

Only paragraphs containing a single image are unwrapped. Mixed text and image content remains a paragraph.

### `elements`

Controls rendered element attributes and classes.

```ts
const nizel = useNizel({
  elements: {
    h1: { class: 'heading-xl' },
    a: {
      attrs: {
        rel: 'noopener noreferrer',
      },
    },
    p(node) {
      return { class: 'copy' };
    },
  },
});
```

Element rules affect rendering, not parsing.

### `blocks`

Defines custom block syntax.

```ts
import { defineBlock, useNizel } from 'nizel';

const alertBlock = defineBlock({
  name: 'alert',
  parse({ args, props, content }) {
    return {
      kind: args[0],
      title: props.title,
      contentLength: content.length,
    };
  },
  formats: {
    html(node, ctx) {
      return `<aside class="alert alert--${ctx.escape(node.value.kind)}">
        ${ctx.render(node.children)}
      </aside>`;
    },
  },
});

const nizel = useNizel({
  blocks: {
    alert: alertBlock,
  },
});
```

Markdown:

```md
::alert warning
title: Careful
::
Pay **attention**.
::
```

### `transforms`

Transforms run after parsing and plugin `afterParse` hooks.

```ts
const nizel = useNizel({
  transforms: [
    (ast) => {
      ast.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: 'Appended' }],
      });
    },
  ],
});
```

### `plugins`

Plugins bundle blocks, elements, filters, transforms, options, and hooks.

```ts
import { defineNizelPlugin } from 'nizel';

const docsPlugin = defineNizelPlugin({
  name: 'docs',
  elements: {
    h2: { class: 'docs-h2' },
  },
  template: {
    filters: {
      uppercase: (value) => String(value).toUpperCase(),
    },
  },
});
```

### `data`

Runtime data available to templates.

```ts
await nizel('# {{ product.name }}', {
  data: {
    product: { name: 'Nizel' },
  },
});
```

### `meta`

Processor-level metadata merged on top of extracted frontmatter.

## Merge Order

Options are merged in this order:

```txt
defaults
plugins
useNizel options
runtime options
```

Later layers override earlier layers.

## Presets

```ts
useNizel.preset('minimal');
useNizel.preset('blog');
useNizel.preset('docs');
useNizel.preset('email');
```

### `minimal`

Disables frontmatter, templates, TOC, anchors, and autolinks.

### `blog`

Default content-oriented behavior with TOC and anchors enabled.

### `docs`

Adds docs-oriented element classes for headings and inline code.

### `email`

Keeps output conservative for email contexts and avoids opening links in new tabs.

## Supported Markdown

Nizel currently supports the documented core Markdown subset:

- paragraphs
- headings `#` through `######`
- emphasis `*text*` and `_text_`
- strong `**text**` and `__text__`
- delete `~~text~~`
- inline code
- fenced code blocks
- links
- images
- unordered lists
- ordered lists
- task list markers
- blockquotes
- thematic breaks
- pipe tables
- autolinked URLs
- autolinked email addresses
- custom `::block` syntax

Nizel normalizes Markdown into its own AST instead of exposing third-party parser node types.

## Code Blocks

Code fences preserve language and metadata.

````md
```ts filename="example.ts" {1,3-5}
const message = 'Hello';
console.log(message);
```
````

AST:

```ts
{
  type: 'code',
  lang: 'ts',
  filename: 'example.ts',
  highlightLines: [1, 3, 4, 5],
  code: "const message = 'Hello';\nconsole.log(message);"
}
```

Core renders a safe fallback:

```html
<pre><code class="language-ts">...</code></pre>
```

Syntax highlighting and copy controls are plugin-owned.

## Templates And Filters

Templates run before Markdown parsing.

```md
# {{ meta.title }}

{{ product.name | kebab }}
{{ price | format('currency', 'EUR') }}
```

Built-in filters include:

- `lower`
- `upper`
- `title`
- `kebab`
- `camel`
- `pascal`
- `snake`
- `constant`
- `format`

Casing filters use `@sil/case`.

Missing values:

```ts
template: {
  missing: 'keep' // keep | empty | error
}
```

Raw output:

```md
{{{ html }}}
```

Raw output is disabled unless `template.raw` is `true`.

## Safety

Nizel escapes:

- text
- attributes
- code
- raw HTML in safe mode
- element-provided attributes

Raw HTML should not be used as a customization mechanism. Use blocks, elements, transforms, or plugins instead.

## First-Party Plugins

### `nizel-plugin-autolink`

Configures built-in autolink behavior.

```ts
import { autolinkPlugin } from 'nizel-plugin-autolink';

const nizel = useNizel({
  plugins: [
    autolinkPlugin({
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  ],
});
```

### `nizel-plugin-code-copy`

Adds copy controls to code blocks.

```ts
import { codeCopyPlugin } from 'nizel-plugin-code-copy';

const nizel = useNizel({
  plugins: [codeCopyPlugin()],
});
```

By default the plugin injects an inline `onclick` handler. Use `codeCopyPlugin({ mode: 'button' })` for button-only markup under strict Content Security Policy.

### `nizel-plugin-task-list`

Renders parsed task-list metadata as view-only or editable checkboxes.

```ts
import { taskListPlugin } from 'nizel-plugin-task-list';

const nizel = useNizel({
  plugins: [taskListPlugin({ mode: 'view' })],
});
```

### `nizel-plugin-shiki`

Provides a Worker-compatible highlighting integration point.

```ts
import { shikiPlugin } from 'nizel-plugin-shiki';

const nizel = useNizel({
  plugins: [
    shikiPlugin({
      theme: 'github-dark',
      highlighter(code, meta) {
        return highlight(code, meta);
      },
    }),
  ],
});
```

If no highlighter is provided, it falls back to safe core code block HTML.

For Worker bundles that should avoid Shiki's WASM engine, use the JavaScript regex helper:

```ts
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

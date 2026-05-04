# Nizel

Nizel is a Markdown content processor for modern applications.

It turns Markdown into structured content your app can use: rendered output, frontmatter, table of contents, headings, links, images, plain text, excerpts, reading time, and an AST.

```ts
import { useNizel } from 'nizel';

const nizel = useNizel();

const { result, html, meta, toc } = await nizel(`
---
title: Hello World
description: My first Nizel page
---

# {{ meta.title }}

Welcome to **Nizel**.
`);
```

## Why Nizel exists

Most Markdown parsers answer one question:

> How do I turn Markdown into HTML?

Nizel answers a more useful application-level question:

> How do I turn Markdown into structured content my app can use?

Markdown in real products usually needs more than HTML. It needs metadata, frontmatter, slugs, anchors, TOC generation, custom blocks, design-system classes, safe links, variables, filters, and plugin-based extension points.

Nizel should provide those things as one predictable pipeline.

## Core API

```ts
const nizel = useNizel(options);

const data = await nizel(markdown, runtimeOptions);
```

The main result object:

```ts
const {
  result,
  html,
  text,
  meta,
  frontmatter,
  toc,
  title,
  description,
  excerpt,
  headings,
  links,
  images,
  readingTime,
  ast,
} = await nizel(markdown);
```

`result` is the selected main output. By default it is the HTML output.

## Built-in formatting

Nizel should include formatting and case filters out of the box using the existing Sil packages:

- `@sil/format`
- `@sil/case`

Example:

```md
---
title: "{{ product.name | title }}"
slug: "{{ product.name | kebab }}"
---

# {{ meta.title }}

Price: {{ price | format('currency', 'EUR') }}
Date: {{ publishedAt | format('date', 'dd MMM yyyy') }}
```

## Main features

- Markdown to HTML
- Frontmatter extraction
- Typed metadata
- Template variables
- Built-in filters from `@sil/format` and `@sil/case`
- Table of contents generation
- Heading anchors and slugs
- Plain-text extraction
- Excerpt generation
- Reading-time calculation
- Link and image extraction
- Element customization
- Custom classes and attributes
- Element replacement
- Custom blocks
- Inline extensions
- AST transforms
- Plugin system
- Safe output defaults
- Presets for blog, docs, email, and minimal usage

## Documentation

- [Full reference](./docs/reference.md)
- [Getting started](./docs/getting-started.md)
- [API](./docs/api.md)
- [Result object](./docs/result.md)
- [Template variables and filters](./docs/template.md)
- [Built-in filters](./docs/filters.md)
- [Frontmatter](./docs/frontmatter.md)
- [Table of contents](./docs/toc.md)
- [Elements](./docs/elements.md)
- [Blocks](./docs/blocks.md)
- [Inline extensions](./docs/inline.md)
- [Transforms](./docs/transforms.md)
- [Plugins](./docs/plugins.md)
- [Presets](./docs/presets.md)
- [Pipeline](./docs/pipeline.md)
- [Safety](./docs/safety.md)
- [Testing](./docs/testing.md)
- [Implementation plan](./docs/implementation-plan.md)

## Design principle

Nizel should not be a low-level Markdown parser with a nicer name.

It should be a content engine with Markdown as its input format.

The parser is an implementation detail. The public value is the stable content model and the simple API.

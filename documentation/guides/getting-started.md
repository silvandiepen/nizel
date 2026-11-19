---
title: Getting Started
icon: ui/folder-star
order: 1
---

# Getting Started

## Install

```bash
npm install nizel
```

## Basic Usage

```ts
import { useNizel } from 'nizel';

const nizel = useNizel();

const { html } = await nizel('# Hello');
```

## With Options

```ts
const nizel = useNizel({
  output: 'html',
  frontmatter: true,
  toc: true,
  anchors: true,
});
```

## Parse a document

```ts
const document = `
---
title: Getting started
---

# Getting started

Nizel returns HTML, metadata, a table of contents, and a stable AST.
`;

const result = await nizel(document);

console.log(result.html);
console.log(result.meta.title);
console.log(result.toc);
```

Template variables are an optional, separate feature. See [Templates](/guides/template) when you need runtime interpolation.

## Result

The main call returns a structured object:

```ts
const {
  result,       // the selected main output (HTML by default)
  html,         // rendered HTML string
  text,         // plain text extraction
  meta,         // parsed frontmatter
  frontmatter,  // raw frontmatter object
  toc,          // table of contents entries
  title,        // first heading text
  description,  // first paragraph text
  excerpt,      // truncated summary
  headings,     // all heading nodes
  links,        // all link references
  images,       // all image references
  readingTime,  // estimated reading time
  ast,          // full AST tree
} = await nizel(markdown);
```

## Next Steps

- [API Reference](/guides/api/index.html) — every option and return value
- [Pipeline](/guides/pipeline/index.html) — how processing works internally
- [Template Variables](/guides/template/index.html) — inject data into Markdown

The [WebAssembly guide](/guides/webassembly/index.html) covers opt-in imports, supported inputs, and fallback behavior.

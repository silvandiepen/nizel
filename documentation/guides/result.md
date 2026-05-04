---
title: Result Object
icon: ui/box
order: 3
---

# Result Object

Nizel returns a structured result object from every parse call.

```ts
const data = await nizel(markdown);
```

## Properties

### `result`

The selected main output. By default this is the HTML string.

```ts
const { result } = await nizel('# Hello');
// result === '<h1>Hello</h1>\n'
```

### `html`

The rendered HTML string, regardless of the `output` setting.

```ts
const { html } = await nizel('# Hello');
// '<h1>Hello</h1>\n'
```

### `text`

Plain text extraction. Strips all Markdown and HTML markup.

```ts
const { text } = await nizel('Hello **world**');
// 'Hello world'
```

### `meta`

Parsed frontmatter as a typed object.

```ts
const { meta } = await nizel(`
---
title: My Page
description: A description
---
Content here.
`);
// { title: 'My Page', description: 'A description' }
```

### `frontmatter`

Raw frontmatter object, same as `meta` but without type enforcement.

### `toc`

Table of contents entries. Only populated when `toc: true`.

```ts
const { toc } = await nizel(`\
# Title
## Section 1
## Section 2
`, { toc: true });
// [
//   { depth: 1, level: 1, text: 'Title', id: 'title', slug: 'title' },
//   { depth: 2, level: 2, text: 'Section 1', id: 'section-1', slug: 'section-1' },
//   { depth: 2, level: 2, text: 'Section 2', id: 'section-2', slug: 'section-2' },
// ]
```

### `title`

Text content of the first heading.

### `description`

Description from frontmatter metadata, if set.

### `excerpt`

A truncated summary of the content. Default 160 characters.

### `headings`

Array of all heading nodes with level, text, and slug.

### `links`

Array of all link references found in the content.

### `images`

Array of all image references found in the content.

### `readingTime`

Estimated reading time in minutes, based on word count.

### `ast`

The full AST tree representing the parsed content.

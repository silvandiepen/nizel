---
title: Frontmatter
icon: ui/file-lines
order: 7
---

# Frontmatter

Nizel extracts a leading frontmatter block before template rendering and Markdown parsing.

## Syntax

Use `---` delimiters at the very start of the Markdown:

```md
---
title: My Page
description: A description of this page
author: silvandiepen
tags:
  - markdown
  - parser
---

# My Page

Content starts here.
```

## Extraction

When `frontmatter: true` (the default), Nizel:

1. Detects the leading `---` block
2. Parses the content between delimiters as YAML
3. Removes the frontmatter from the Markdown body
4. Stores the result in `meta` and `frontmatter`

## Accessing Metadata

```ts
const { meta } = await nizel(`
---
title: Hello
count: 42
---
Content.
`);

// meta.title === 'Hello'
// meta.count === 42
```

## Template Variables in Frontmatter

Frontmatter values support template expressions:

```md
---
title: "{{ product.name | title }}"
slug: "{{ product.name | kebab }}"
---
```

Template expressions in frontmatter values are resolved after the YAML is parsed, using the provided variables and data.

## Derived Fields

Nizel can derive fields from the content when they are not in frontmatter:

- **title** — first heading text
- **description** — first paragraph text
- **excerpt** — truncated content summary

## Options

| Option | Default | Description |
|---|---|---|
| `frontmatter` | `true` | Enable frontmatter extraction |

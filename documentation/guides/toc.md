---
title: Table of Contents
icon: ui/list
order: 8
---

# Table of Contents

Nizel collects headings into `result.toc` when `toc: true` is set.

## Enable TOC

```ts
const nizel = useNizel({ toc: true });

const { toc } = await nizel(`
# Title
## Section 1
### Subsection
## Section 2
`);
```

## Output Format

The `toc` array contains objects with:

```ts
interface TocEntry {
  depth: number;   // heading depth (1-6)
  level: number;   // alias for depth
  text: string;    // heading text content
  id: string;      // generated anchor id
  slug: string;    // alias for id
}
```

## Example

```ts
// Given:
// # Getting Started
// ## Install
// ## Configuration
// ### Theme
// ### Language

const { toc } = await nizel(markdown, { toc: true });

// toc === [
//   { depth: 1, level: 1, text: 'Getting Started', id: 'getting-started', slug: 'getting-started' },
//   { depth: 2, level: 2, text: 'Install', id: 'install', slug: 'install' },
//   { depth: 2, level: 2, text: 'Configuration', id: 'configuration', slug: 'configuration' },
//   { depth: 3, level: 3, text: 'Theme', id: 'theme', slug: 'theme' },
//   { depth: 3, level: 3, text: 'Language', id: 'language', slug: 'language' },
// ]
```

## Heading Anchors

When `anchors: true`, Nizel adds `id` attributes to headings matching their slug:

```html
<h1 id="getting-started">Getting Started</h1>
<h2 id="install">Install</h2>
```

## Slug Generation

Slugs follow GitHub-style slugification by default:

- lowercase
- spaces become hyphens
- special characters removed
- consecutive hyphens collapsed

Use `slugStyle: 'classic'` for a simpler algorithm.

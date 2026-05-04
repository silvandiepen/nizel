# Implementation Plan

This document defines the recommended build order for Nizel.

The goal is to make the first implementation small, working, typed, and extensible.

## Phase 0: Monorepo setup

Create the base workspace.

```txt
packages/
  nizel/
    src/
      index.ts
      use-nizel.ts
      types.ts
      defaults.ts
      pipeline.ts
      template/
      frontmatter/
      parse/
      normalize/
      render/
      collect/
      plugins/
    package.json

  plugin-shiki/
    src/index.ts
    package.json

  plugin-code-copy/
    src/index.ts
    package.json

  plugin-autolink/
    src/index.ts
    package.json
```

Root files:

```txt
package.json
package-lock.json
tsconfig.json
tsconfig.base.json
.changeset/config.json
.github/workflows/ci.yml
.github/workflows/release.yml
```

## Phase 1: Core package skeleton

Implement `packages/nizel`.

Required exports:

```ts
export { useNizel } from './use-nizel';
export { defineNizelPlugin } from './plugins/define-nizel-plugin';
export { defineBlock } from './blocks/define-block';
export type * from './types';
```

Initial API:

```ts
const nizel = useNizel();

const data = await nizel('# Hello');
```

Helper methods:

```ts
await nizel.html(markdown);
await nizel.text(markdown);
await nizel.ast(markdown);
await nizel.meta(markdown);
```

## Phase 2: Result model and types

Implement the documented `NizelResult` and AST node types.

The result object must include:

- `result`
- `html`
- `text`
- `ast`
- `meta`
- `frontmatter`
- `title`
- `description`
- `excerpt`
- `toc`
- `headings`
- `links`
- `images`
- `readingTime`

## Phase 3: Frontmatter

Implement frontmatter extraction before template rendering.

Supported format:

```md
---
title: Hello
---

# Hello
```

Rules:

- Frontmatter keys go to `meta` and `frontmatter`.
- Frontmatter is not part of the AST.
- `meta` and `frontmatter` can initially reference the same object.

## Phase 4: Template engine

Implement small variable interpolation.

Supported syntax:

```md
{{ value }}
{{ user.name }}
{{ meta.title }}
{{ value | kebab }}
{{ amount | format('currency', 'EUR') }}
```

Do not implement arbitrary JavaScript or EJS logic.

Rules:

- no `eval`
- escaped output by default
- raw output only through explicit triple braces later
- missing values configurable: `keep | empty | error`

Built-in filters must include functions from:

- `@sil/case`
- `@sil/format`

## Phase 5: Markdown parse and normalization

Use an existing Markdown parser for v0.1.

Recommended:

- `micromark` / `mdast-util-from-markdown`
- or unified/remark if faster to implement

Normalize parser output into the Nizel AST from `docs/ast.md`.

Do not expose third-party AST types as public API.

## Phase 6: HTML renderer

Implement a safe HTML renderer from the normalized AST.

Minimum node support:

- root
- text
- paragraph
- heading
- emphasis
- strong
- inlineCode
- code
- link
- image
- list
- listItem
- blockquote
- thematicBreak

Raw HTML should be disabled or escaped by default in safe mode.

## Phase 7: Collectors

Implement collectors from the AST:

- headings
- toc
- links
- images
- plain text
- excerpt
- reading time

Collectors should not parse Markdown strings. They should walk the AST.

## Phase 8: Autolinks

Automatic links should be enabled by default.

Rules:

- convert URLs to link nodes
- convert emails to `mailto:` links
- ignore code blocks
- ignore inline code
- ignore existing links

Autolink behavior can later be externalized or overridden by plugin.

## Phase 9: Elements system

Implement element decoration.

Supported features:

```ts
elements: {
  h1: { class: 'heading' },
  a: { attrs: { rel: 'noopener noreferrer' } },
  p(node, ctx) {
    return { class: 'text' };
  }
}
```

Element rules should affect rendering, not parsing.

## Phase 10: Plugins

Implement plugin registration and option merging.

Plugins may provide:

- elements
- blocks
- inline extensions
- transforms
- template filters
- hooks

Merge order:

```txt
defaults
→ presets
→ plugins
→ useNizel options
→ runtime options
```

## Phase 11: Blocks

Implement basic custom block parsing.

Syntax:

```md
::alert warning
Content
::
```

Props syntax:

```md
::card
title: Hello
image: /image.jpg
::

Content

::
```

Blocks should become structured AST nodes, not raw HTML strings.

## Phase 12: First-party plugins

Create initial plugin packages:

### `nizel-plugin-shiki`

- Shiki-based code highlighting
- async setup
- Worker-compatible
- block highlighting by default
- inline highlighting opt-in

### `nizel-plugin-code-copy`

- copy-button markup/runtime behavior
- no inline JavaScript by default
- CSP-friendly
- framework-friendly

### `nizel-plugin-autolink`

Optional override/plugin form of the default autolink behavior.

## Phase 13: Presets

Implement:

```ts
useNizel.preset('minimal')
useNizel.preset('blog')
useNizel.preset('docs')
useNizel.preset('email')
```

Presets should just be option/plugin bundles.

## Phase 14: Tests

Minimum tests:

- Markdown to HTML
- frontmatter extraction
- template replacement
- built-in filters
- TOC generation
- autolinks
- code block metadata
- plugin merge order
- element class rendering
- safe output escaping

## Phase 15: Release readiness

Before publishing:

- root monorepo setup works
- CI passes
- packages build
- package names checked on npm
- npm Trusted Publishing configured per package
- changeset created

## v0.1 Scope

v0.1 should ship:

- monorepo setup
- `nizel` core package
- Markdown to HTML
- result object
- frontmatter
- template variables
- built-in filters
- AST normalization
- TOC/headings/links/images/text collectors
- safe rendering
- autolinks
- basic plugin system

Blocks and first-party plugins can be included if ready, but should not block v0.1.

# Monorepo Architecture

Nizel should be developed as a monorepo.

The core package should stay small, while larger or optional features can live in first-party plugin packages.

## Goals

- Keep `nizel` usable out of the box.
- Allow optional features to be externalized.
- Ship first-party plugins from the same repository.
- Make it easy for Codex or contributors to add features without bloating core.
- Keep package boundaries clear.

## Proposed structure

```txt
packages/
  nizel/
    src/
    package.json

  plugin-code-highlight/
    src/
    package.json

  plugin-autolink/
    src/
    package.json

  plugin-sil/
    src/
    package.json

  plugin-docs/
    src/
    package.json

  plugin-blog/
    src/
    package.json

  plugin-email/
    src/
    package.json
```

## Root files

```txt
package.json
pnpm-workspace.yaml
tsconfig.json
tsconfig.base.json
README.md
docs/
```

## Package naming

The main package should be published as:

```txt
nizel
```

First-party plugin packages can be published as unscoped names if available, or as scoped packages later if needed.

Recommended internal workspace names:

```txt
@nizel/core-internal only if needed internally
nizel
nizel-plugin-code-highlight
nizel-plugin-autolink
nizel-plugin-sil
nizel-plugin-docs
nizel-plugin-blog
nizel-plugin-email
```

If npm package names become a problem, the repository structure can stay the same and publication names can be adjusted later.

## What belongs in core

Core should include features that are part of the default Nizel contract:

- Markdown parsing
- HTML output
- plain text output
- frontmatter extraction
- template variables
- filters from `@sil/format` and `@sil/case`
- safe output defaults
- result object generation
- TOC generation
- heading extraction
- link extraction
- image extraction
- automatic links enabled by default
- plugin system
- block system
- element customization
- transform system

## What should be externalized

Large or optional features should be plugins:

- syntax highlighting
- code block enhancements
- copy-code metadata
- docs-specific blocks
- blog-specific helpers
- email rendering constraints
- framework renderers
- Vue output
- React output
- localization/translation helpers

## First-party plugins

First-party plugins should be developed inside the monorepo and exported as normal packages.

Example:

```ts
import { useNizel } from 'nizel';
import { codeHighlightPlugin } from 'nizel-plugin-code-highlight';

const nizel = useNizel({
  plugins: [codeHighlightPlugin()]
});
```

## Bundled defaults

Some plugins can also be bundled into core presets.

Example:

```ts
const nizel = useNizel.preset('docs');
```

The docs preset can internally enable:

- code highlighting
- autolinks
- heading anchors
- callout blocks
- tabs

## Dependency strategy

Core should avoid heavy dependencies when possible.

Syntax highlighting is a good example: Shiki is powerful but heavy, so it should live in a plugin.

Core can define the code-highlight API and fallback rendering. The plugin provides the heavy implementation.

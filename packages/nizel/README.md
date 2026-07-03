# nizel

Markdown content processor for modern applications.

Custom CommonMark 0.31 parser with frontmatter, templates, filters, elements, plugins, custom blocks, and transforms. No third-party markdown libraries.

## Install

```bash
npm install nizel
```

## Usage

```js
import { useNizel } from 'nizel';

const processor = useNizel({
  // optional configuration
});

const result = processor.process('# Hello {{ name }}', {
  data: { name: 'World' }
});
```

## Result

`process()` returns:

- `files` — output files (HTML by default)
- `pages` — page metadata from frontmatter
- `project` — project-level data
- `languages` — language info

## Convenience Methods

```js
processor.parse(markdown);  // AST only, no rendering
processor.render(markdown); // HTML string
```

## Features

- **CommonMark 0.31** — full spec compliance (652/652 tests)
- **Frontmatter** — YAML with arrays, templates, and variable resolution
- **Filters** — 14 built-in: camel, capital, const, dot, header, kebab, lower, pascal, path, sentence, slug, snake, upper, format
- **Elements** — customize HTML tags and attributes for any node type
- **Templates** — `{{ variable }}` syntax with filter chains
- **Plugins** — `defineNizelPlugin()` with `beforeParse`, `afterParse`, `afterRender` hooks
- **Custom blocks** — `defineBlock()` for domain-specific content
- **Transforms** — post-processing pipeline
- **Presets** — `blog`, `email` built-in, or create your own
- **Safety** — `onclick`/`onerror` handlers stripped, `javascript:` URLs stripped
- **TOC** — table of contents with level/slug aliases

## Options

```js
useNizel({
  data: {},              // template variables
  variables: {},         // alias for data
  preset: 'blog',       // or 'email', or custom object
  slugStyle: 'kebab',   // slug generation style
  elements: {
    a: { tag: 'a', attrs: { target: '_blank' } }
  },
  plugins: [myPlugin()],
  filters: { custom: (v) => v.toUpperCase() },
  blocks: { note: myNoteBlock },
});
```

## Plugins

Official plugins available:

- `nizel-plugin-abbr` — abbreviation definitions with `<abbr>` output
- `nizel-plugin-alert` — GitHub-style and custom alert blocks
- `nizel-plugin-autolink` — configurable bare URL and email links
- `nizel-plugin-citations` — citation references and bibliography output
- `nizel-plugin-code-copy` — CSP-friendly copy controls for code blocks
- `nizel-plugin-deflist` — definition-list syntax
- `nizel-plugin-details` — disclosure/details blocks
- `nizel-plugin-diagrams` — Mermaid code block containers
- `nizel-plugin-emoji` — `:name:` emoji shortcuts
- `nizel-plugin-footnotes` — footnote references and definitions
- `nizel-plugin-frontmatter-ui` — frontmatter metadata rendering helpers
- `nizel-plugin-gfm` — GFM-oriented plugin preset
- `nizel-plugin-heading-anchors` — visible anchor links on headings
- `nizel-plugin-math` — inline and display math wrappers
- `nizel-plugin-media` — figure, caption, lazy, and responsive image helpers
- `nizel-plugin-sanitize` — additional rendered HTML sanitizing
- `nizel-plugin-shiki` — code syntax highlighting via Shiki
- `nizel-plugin-toc` — rendered `[[toc]]` table of contents
- `nizel-plugin-typography` — mark, subscript, and superscript extensions

For native apps or WebViews that need a single browser bundle with a settings-friendly plugin registry, use `nizel-kit`.

For ready-to-link content styling, use `nizel-style`. It ships scoped CSS for core rendered content plus optional plugin CSS entrypoints such as `nizel-style/plugins/alert.css` and `nizel-style/plugins/code-copy.css`.

## License

MIT

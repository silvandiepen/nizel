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

const result = await processor('# Hello {{ name }}', {
  data: { name: 'World' }
});
```

## Result

The processor returns:

- `result`, `html`, `text`, and `ast`
- `meta` and `frontmatter`
- `title`, `description`, and `excerpt`
- `toc`, `headings`, `links`, and `images`
- `readingTime`

## Convenience Methods

```js
await processor.parse(markdown);   // AST only
processor.render(ast);             // AST to HTML
processor.markdown(ast);           // AST to Markdown
await processor.document(markdown); // portable document
```

Portable documents use the versioned `nizel/document` schema and can be passed
through `serializeNizelDocument()` and `deserializeNizelDocument()`. Use
`completeStreamingMarkdown()` before parsing incomplete streamed content.

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
- `nizel-plugin-code-copy` — copy controls for code blocks
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
- `nizel-plugin-task-list` — task-list checkbox rendering
- `nizel-plugin-toc` — rendered `[[toc]]` table of contents
- `nizel-plugin-typography` — mark, subscript, and superscript extensions

For native apps or WebViews that need a single browser bundle with a settings-friendly plugin registry, use `nizel-kit`.

For ready-to-link content styling, use `nizel-style`. It ships scoped CSS for core rendered content plus optional plugin CSS entrypoints such as `nizel-style/plugins/alert.css` and `nizel-style/plugins/code-copy.css`.

## License

MIT

## Optional WebAssembly renderer

Import from `nizel/wasm` on Node or `nizel/browser/wasm` in a browser build. The opt-in entry points have the same exports and call signatures as the corresponding JavaScript entry points.

```js
import { useNizel, htmlToMarkdown } from 'nizel/wasm';

const nizel = useNizel();
const html = await nizel.html('A **bold** word.');
const markdown = htmlToMarkdown(html);
```

The module is compiled lazily on the first eligible call. The binary is included in the package, so initialization needs no network request. Standard imports keep using JavaScript. Consumers can switch imports independently in the same process. To disable Wasm, switch back to the original entry point.

- Markdown acceleration covers ASCII paragraphs, line breaks, uncomplicated ATX headings and IDs, and simple inline code and emphasis. HTML conversion covers the corresponding semantic markup, common named entities, and simple headings with matching IDs.
- The backend falls back for unsupported syntax, custom rendering rules, AST transforms, reverse plugin handlers, or inputs over 1,048,576 UTF-16 code units. It also falls back when the runtime blocks compilation or a Wasm operation fails. Before-parse and after-render hooks run in either path.
- AST, document, metadata, and text APIs continue to use the existing JS implementation. The browser wrapper accepts the same strings, nodes, ranges, and selections.
- Run `npm run build --workspace nizel` to build the optional binary from `packages/nizel/assembly/renderer.ts`. The AssemblyScript compiler is a build dependency. The package verification suite compares both entry points, both conversion directions, missing-Wasm fallback, options, and plugin behavior against the stock implementation.

For the offline WebView bundle, use `nizel-kit/wasm` or the `nizel-kit.wasm.iife.js` build from the matching `nizel-kit` release. Keep JavaScript fallback enabled and measure the HTML subset and plugin configuration you actually ship. On a site with a restrictive Content Security Policy, compilation must be permitted for the fast path to run.

# Application Rendering Roadmap

Nizel's renderer roadmap keeps the core focused on application-ready content while adding framework-native and streaming presentation.

## Shipped Foundation

- `NizelDocument`: versioned, JSON-safe AST and metadata envelope
- `serializeNizelDocument()` and `deserializeNizelDocument()`
- `renderMarkdown()` and `nizel.markdown()` for AST/document serialization
- `completeStreamingMarkdown()` for incomplete frontmatter, code fences, custom blocks, links, code spans, strong text, and deleted text
- `visitNizel()` as the shared depth-first traversal primitive for renderers and analysis

The document schema is deliberately separate from `NizelResult`. Derived values such as HTML and reading time are recomputed rather than duplicated in network payloads.

## Phase 2: Renderer Contract

Define a small renderer package that maps every core node type to a host callback. Requirements:

- Render an AST or `NizelDocument` without the parser
- Map standard node types and named custom blocks
- Preserve typed node and parent context
- Support synchronous host renderers; isolate asynchronous plugin preparation before rendering
- Test one shared conformance fixture against HTML and framework renderers

## Phase 3: React and Vue

Create `@nizel/react` and `@nizel/vue` on the shared renderer contract.

- `Markdown`: parse and render source
- `NizelDocument`: render a pre-parsed document without bundling the parser
- Component maps for standard nodes and custom blocks
- Streaming and caret props
- Server rendering support
- Package-specific tree-shaking and bundle-size tests

React and Vue come first because they validate two different rendering models. Svelte, Angular, and other adapters should follow only after the contract is stable.

## Phase 4: Streaming

The shipped completion helper provides stable frames while reparsing accumulated source. Follow-up work:

- Add fixtures for chunk boundaries across every CommonMark delimiter
- Expose a provisional-document marker and caret insertion helper
- Benchmark accumulated-source parsing for realistic AI responses
- Investigate incremental block reuse only if profiles show reparsing is a practical bottleneck

## Phase 5: Playground

Build an interactive documentation route with:

- Markdown input and streamed-input simulation
- HTML preview
- Result, AST, metadata, links, images, and TOC inspectors
- Plugin toggles sourced from the official registry
- Safe-mode comparison
- Markdown and portable-document output
- Shareable examples encoded in the URL

## Compatibility Rules

- Never change a published document version in place.
- Additive AST fields do not require a new document version.
- Renamed or structurally changed nodes require a migration and a new version.
- Framework packages accept the document versions explicitly listed in their peer compatibility range.
- Core remains safe by default; framework component mappings do not implicitly enable raw HTML.

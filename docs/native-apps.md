# Native Apps

Nizel can be embedded in native apps through a JavaScript runtime such as `WKWebView` or `JSContext`.

Use `nizel-kit` when the app should let users choose supported plugins from settings. The native app only stores plugin IDs; Markdown parsing and extension handling remain inside Nizel.

Use `nizel-format` when the app needs to normalize Markdown source before saving.

## Bundle

Build the kit:

```bash
npm run build --workspace nizel-kit
```

Load this file in the native JavaScript environment:

```text
packages/nizel-kit/dist/nizel-kit.iife.js
```

It exposes a global:

```js
NizelKit
```

## Plugin Settings

Use `NizelKit.supportedPlugins` to build a settings screen:

```js
NizelKit.supportedPlugins
```

Each item contains:

- `id`
- `label`
- `description`
- `defaultEnabled`
- `category`
- `exclusiveGroup`

Store selected plugin IDs in Swift:

```swift
let enabledPlugins = ["sanitize", "autolink", "alert", "deflist", "footnotes", "math", "typography", "diagrams"]
```

Pass the IDs into the renderer:

```js
const html = await NizelKit.markdownToHtml(markdown, {
  enabledPlugins: ["sanitize", "autolink", "alert", "deflist", "footnotes", "math", "typography", "diagrams"]
});
```

## Supported Plugin IDs

`NizelKit.supportedPlugins` currently includes:

- `sanitize`
- `autolink`
- `gfm`
- `emoji`
- `abbr`
- `citations`
- `alert`
- `details`
- `deflist`
- `frontmatter-ui`
- `heading-anchors`
- `media`
- `toc`
- `footnotes`
- `math`
- `typography`
- `diagrams`
- `shiki`
- `code-copy`

## Code Renderers

The first-party code-related plugins are composable:

- `diagrams` only converts explicit ```` ```mermaid ```` fences.
- `shiki` renders ordinary code fences when configured with a highlighter.
- `code-copy` wraps rendered code or diagram output with copy controls.

They can be enabled together.

## Source Formatting

Build the formatter:

```bash
npm run build --workspace nizel-format
```

Load:

```text
packages/nizel-format/dist/nizel-format.iife.js
```

Format Markdown before saving:

```js
const formatted = NizelFormat.formatMarkdown(markdown);
```

## Kitchen Sink

The Markdown kitchen-sink fixture should be rendered with the plugins it is intended to test. It is not a plugin itself.

For the current fixture, enable:

```js
[
  "sanitize",
  "autolink",
  "alert",
  "deflist",
  "footnotes",
  "math",
  "typography",
  "diagrams",
  "shiki",
  "code-copy"
]
```

## Plugin Overhead Benchmarks

Run the per-plugin overhead benchmark to measure the cost of each checkbox independently:

```bash
npm run benchmark:plugins -- --time=100 --warmup=25
```

The benchmark compares `core` versus `core + plugin` on a focused fixture for each plugin and writes:

```text
apps/benchmarks/results/plugin-overhead-latest.json
```

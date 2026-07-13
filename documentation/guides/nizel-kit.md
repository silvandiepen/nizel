---
title: NizelKit for Native Apps
icon: ui/smartphone
order: 11
---

# NizelKit for Native Apps

`nizel-kit` is the browser/WebView bundle for native apps that want Nizel rendering with user-selectable plugins.

Use it when a Swift iOS or macOS app should expose settings such as "Support footnotes", "Support math", or "Support diagrams" without reimplementing Markdown extension parsing in Swift. The native app stores plugin IDs. NizelKit owns Markdown parsing, plugin composition, rendering, and plugin conflict handling.

Use `nizel-format` separately when the native app needs to normalize Markdown source before saving. See [Nizel Format](/guides/nizel-format/index.html).

## Build the Bundle

Install and build from the Nizel workspace:

```bash
npm install
npm run build --workspace nizel-kit
```

The native app should load:

```txt
packages/nizel-kit/dist/nizel-kit.iife.js
```

The IIFE exposes:

```js
NizelKit
```

## Render Markdown

```js
const html = await NizelKit.markdownToHtml(markdown, {
  enabledPlugins: ['sanitize', 'autolink', 'alert', 'footnotes', 'math']
});
```

`enabledPlugins` is an array of plugin IDs. Unknown IDs are ignored.

## Settings UI

Use `NizelKit.supportedPlugins` to build a native settings screen:

```js
NizelKit.supportedPlugins
```

Each entry is serializable:

```ts
type NizelKitPluginMeta = {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  category: string;
  exclusiveGroup?: string;
};
```

The Swift-side model can mirror that shape:

```swift
struct NizelPluginSetting: Codable, Identifiable {
    let id: String
    let label: String
    let description: String
    let defaultEnabled: Bool
    let category: String
    let exclusiveGroup: String?
}
```

Store only the selected plugin IDs:

```swift
let enabledPlugins = [
    "sanitize",
    "autolink",
    "alert",
    "footnotes",
    "math",
    "typography"
]
```

Then pass those IDs into JavaScript when rendering.

## Supported Plugin IDs

`NizelKit.supportedPlugins` currently includes:

| ID | Package |
| --- | --- |
| `sanitize` | `nizel-plugin-sanitize` |
| `autolink` | `nizel-plugin-autolink` |
| `gfm` | `nizel-plugin-gfm` |
| `emoji` | `nizel-plugin-emoji` |
| `abbr` | `nizel-plugin-abbr` |
| `citations` | `nizel-plugin-citations` |
| `alert` | `nizel-plugin-alert` |
| `details` | `nizel-plugin-details` |
| `deflist` | `nizel-plugin-deflist` |
| `frontmatter-ui` | `nizel-plugin-frontmatter-ui` |
| `heading-anchors` | `nizel-plugin-heading-anchors` |
| `hidden-comments` | `nizel-plugin-hidden-comments` |
| `media` | `nizel-plugin-media` |
| `toc` | `nizel-plugin-toc` |
| `footnotes` | `nizel-plugin-footnotes` |
| `math` | `nizel-plugin-math` |
| `typography` | `nizel-plugin-typography` |
| `diagrams` | `nizel-plugin-diagrams` |
| `shiki` | `nizel-plugin-shiki` |
| `code-copy` | `nizel-plugin-code-copy` |

## Default Plugins

Use `defaultEnabledPlugins()` when the app needs an initial settings value:

```js
const enabledPlugins = NizelKit.defaultEnabledPlugins();
```

The native app should persist the user's selected IDs after that first load.

## Plugin Normalization

NizelKit ignores unknown IDs and removes duplicate selections:

```js
const normalized = NizelKit.normalizeEnabledPlugins([
  'code-copy',
  'shiki',
  'diagrams'
]);
```

Code-related first-party plugins are composable: `diagrams` handles explicit Mermaid fences, `shiki` handles ordinary code fences, and `code-copy` wraps rendered code or diagram output.

## Plugin Options

Pass plugin-specific options with `pluginOptions`:

```js
const html = await NizelKit.markdownToHtml(markdown, {
  enabledPlugins: ['sanitize', 'math', 'diagrams'],
  pluginOptions: {
    sanitize: { allowRawHtml: false },
    math: {
      inlineClassName: 'math math-inline',
      blockClassName: 'math math-display'
    },
    diagrams: { className: 'mermaid' }
  }
});
```

## WKWebView Shape

One common Swift integration is:

1. Load `nizel-kit.iife.js` into a hidden or preview `WKWebView`.
2. Read `NizelKit.supportedPlugins` once and map it to native settings rows.
3. Persist selected plugin IDs in app settings.
4. Call `NizelKit.markdownToHtml(markdown, { enabledPlugins })`.
5. Inject or display the returned HTML in the preview.

Keep Markdown source unchanged in Swift. The point of NizelKit is that Lezin can toggle Nizel plugins without converting extension syntax before rendering.

## Kitchen Sink Testing

The kitchen-sink fixture is a test document, not a plugin. Render it with the plugins it is meant to exercise:

```js
await NizelKit.markdownToHtml(kitchenSinkMarkdown, {
  enabledPlugins: [
    'sanitize',
    'autolink',
    'alert',
    'deflist',
    'footnotes',
    'math',
    'typography',
    'diagrams',
    'shiki',
    'code-copy'
  ]
});
```

## Benchmarks

Measure per-plugin overhead with:

```bash
npm run benchmark:plugins -- --time=100 --warmup=25
```

The benchmark reports `core`, each individual plugin, `kit-default`, and `kit-all` so you can see the cost of each setting and the full native-app bundle profile.

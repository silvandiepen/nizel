# nizel-kit

Browser and native WebView integration bundle for Nizel.

`nizel-kit` packages the browser renderer plus a registry of official plugins. Native apps can show settings from `supportedPlugins`, store selected plugin IDs, and pass those IDs back to the renderer. The Swift app does not need to parse or convert Markdown extension syntax.

## Install

```bash
npm install nizel-kit
```

## Browser / IIFE

Use `dist/nizel-kit.iife.js` in `WKWebView`, `JSContext`, or a browser shell. It exposes `NizelKit`.

```js
const html = await NizelKit.markdownToHtml(markdown, {
  enabledPlugins: ['alert', 'deflist', 'footnotes', 'math', 'typography', 'diagrams'],
});
```

## Settings UI

`supportedPlugins` is intentionally serializable:

```js
NizelKit.supportedPlugins
// [{ id, label, description, defaultEnabled, category, exclusiveGroup? }, ...]
```

For Swift, store `[String]` plugin IDs such as:

```swift
let enabledPlugins = ["alert", "math", "typography"]
```

Then pass that array into JavaScript when rendering.

Code-rendering plugins use `exclusiveGroup: "code-renderer"`. If multiple code renderers are selected, `nizel-kit` keeps the last selected one so the renderer remains deterministic.

## API

- `supportedPlugins` - serializable plugin metadata for settings screens.
- `defaultEnabledPlugins()` - plugin IDs enabled by default.
- `normalizeEnabledPlugins(ids)` - validates plugin IDs and resolves exclusive groups.
- `createPlugins(ids, pluginOptions)` - returns Nizel plugin instances.
- `useNizelKit(options)` - creates a browser processor with selected plugins.
- `markdownToHtml(markdown, options)` - renders Markdown to HTML.
- `mountMarkdown(target, markdown, options)` - renders into a browser/WebView DOM target.

## Plugin IDs

`abbr`, `alert`, `autolink`, `citations`, `code-copy`, `deflist`, `details`, `diagrams`, `emoji`, `footnotes`, `frontmatter-ui`, `gfm`, `heading-anchors`, `math`, `media`, `sanitize`, `shiki`, `toc`, and `typography`.

## Swift / WebView Shape

```swift
struct NizelPluginSetting: Codable, Identifiable {
    let id: String
    let label: String
    let description: String
    let defaultEnabled: Bool
    let category: String
}
```

Load `nizel-kit.iife.js`, read `NizelKit.supportedPlugins` to build the settings UI, persist selected IDs, and call `NizelKit.markdownToHtml(markdown, { enabledPlugins })` when rendering.

## License

MIT

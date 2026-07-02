# Plugins

For native Swift apps and WebViews, use `nizel-kit` when you need a single bundled renderer with a user-facing plugin registry. See [Native Apps](./native-apps.md).

Plugins bundle optional functionality. The core `nizel` package stays focused on Markdown parsing, rendering, templates, blocks, and the plugin pipeline. Syntax that is GFM-specific, app-specific, or extension-specific lives in plugins.

## Example

```ts
defineNizelPlugin({
  name: 'docs',

  elements: {
    h2: { class: 'docs-h2' }
  },

  template: {
    filters: {
      uppercase: (v) => String(v).toUpperCase()
    }
  }
});
```

## Usage

```ts
const nizel = useNizel({
  plugins: [docsPlugin()]
});
```

## Capabilities

Plugins can define:

- elements
- blocks
- inline extensions
- transforms
- template filters
- hooks

## Official Plugins

Nizel publishes these first-party plugins from this workspace:

| Package | Purpose |
| --- | --- |
| `nizel-plugin-abbr` | Adds `*[HTML]: ...` abbreviation definitions |
| `nizel-plugin-alert` | GitHub-style `> [!NOTE]` callouts and `::note` alert blocks |
| `nizel-plugin-autolink` | Configures bare URL and email autolinking |
| `nizel-plugin-citations` | Adds `[@id]` citations and a bibliography |
| `nizel-plugin-code-copy` | Adds CSP-friendly copy markup to code blocks |
| `nizel-plugin-deflist` | Adds definition list syntax |
| `nizel-plugin-details` | Adds disclosure/details blocks |
| `nizel-plugin-diagrams` | Renders Mermaid code blocks as diagram containers |
| `nizel-plugin-emoji` | Replaces `:name:` emoji shortcuts outside code |
| `nizel-plugin-footnotes` | Adds `[^id]` footnote references and definitions |
| `nizel-plugin-frontmatter-ui` | Renders frontmatter-like metadata blocks |
| `nizel-plugin-gfm` | Convenience preset for GFM companion plugins |
| `nizel-plugin-heading-anchors` | Adds visible anchor links to headings |
| `nizel-plugin-math` | Adds `$inline$` and `$$` display math wrappers |
| `nizel-plugin-media` | Enhances standalone images with figure markup |
| `nizel-plugin-sanitize` | Adds an output sanitizing pass for WebView/native use |
| `nizel-plugin-shiki` | Integrates Worker-compatible syntax highlighting |
| `nizel-plugin-toc` | Renders `[[toc]]` into a linked table of contents |
| `nizel-plugin-typography` | Adds `==mark==`, `H~2~O`, and `x^2^` typography |
| `nizel-kit` | Browser/WebView kit with all official plugins in a serializable registry |

Each plugin is authored in TypeScript, builds to `dist`, publishes declaration files, and has unit and integration tests.

Website docs for every plugin live in `documentation/plugins`. Native/WebView integration docs live in `docs/native-apps.md`.

## Priority

```txt
defaults
→ presets
→ plugins
→ options
→ runtime options
```

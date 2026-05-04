# Plugins

Plugins bundle functionality.

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
| `nizel-plugin-alert` | GitHub-style `::note`, `::tip`, `::warning`, and related alert blocks |
| `nizel-plugin-autolink` | Configures bare URL and email autolinking |
| `nizel-plugin-code-copy` | Adds CSP-friendly copy markup to code blocks |
| `nizel-plugin-deflist` | Adds definition list syntax |
| `nizel-plugin-emoji` | Replaces `:name:` emoji shortcuts outside code |
| `nizel-plugin-shiki` | Integrates Worker-compatible syntax highlighting |

Each plugin is authored in TypeScript, builds to `dist`, publishes declaration files, and has unit and integration tests.

## Priority

```txt
defaults
→ presets
→ plugins
→ options
→ runtime options
```

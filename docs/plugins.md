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

## Priority

```txt
defaults
→ presets
→ plugins
→ options
→ runtime options
```

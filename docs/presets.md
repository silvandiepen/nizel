# Presets

Nizel exposes built-in option bundles.

```ts
const minimal = useNizel.preset('minimal');
const blog = useNizel.preset('blog');
const docs = useNizel.preset('docs');
const email = useNizel.preset('email');
```

## `minimal`

Disables:

- frontmatter
- templates
- TOC
- anchors
- autolinks

## `blog`

Keeps default content behavior with TOC and anchors enabled.

## `docs`

Adds documentation-oriented element classes.

## `email`

Keeps link output conservative for email contexts.


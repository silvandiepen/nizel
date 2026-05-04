---
title: Presets
icon: ui/cube
order: 11
---

# Presets

Nizel exposes built-in option bundles for common use cases.

## Available Presets

### `blog`

Optimized for blog content:

```ts
const nizel = useNizel({ preset: 'blog' });
// frontmatter: true
// toc: true
// anchors: true
// elements: { time: { class: 'nizel-date' } }
```

### `docs`

Optimized for documentation:

```ts
const nizel = useNizel({ preset: 'docs' });
// toc: true
// anchors: true
// elements: { h2: { class: 'nizel-docs-heading' }, code: { class: 'nizel-code' } }
```

### `email`

Optimized for email HTML:

```ts
const nizel = useNizel({ preset: 'email' });
// safe: true
// anchors: false
// autolinks: { enabled: true }
// elements: {
//   a: { attr: { target: undefined, rel: undefined } },
//   table: { attr: { role: 'presentation', cellpadding: '0', cellspacing: '0', border: '0' } },
// }
```

### `minimal`

Minimal processing, no extras:

```ts
const nizel = useNizel({ preset: 'minimal' });
// frontmatter: false
// template: false
// toc: false
// anchors: false
// autolinks: false
```

## Override Preset Options

Presets set defaults. You can override individual options:

```ts
const nizel = useNizel({
  preset: 'blog',
  toc: false, // disable TOC from the blog preset
});
```

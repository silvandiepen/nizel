---
title: Elements
icon: ui/paint-brush
order: 9
---

# Elements

Elements control how HTML is generated from the AST. You can customize tag names, attributes, and classes for any element type.

## Customization

Use the `elements` option to override HTML output:

```ts
const nizel = useNizel({
  elements: {
    h1: { class: 'title is-1' },
    h2: { class: 'title is-2' },
    p: { class: 'content' },
    a: { target: '_blank', rel: 'noopener' },
    code: { class: 'language-code' },
  },
});
```

## Per-Element Options

Each element accepts:

| Property | Type | Description |
|---|---|---|
| `tag` | `string` | Replace the HTML tag |
| `class` | `string` | Add CSS class(es) |
| `attr` | `object` | Add HTML attributes |
| `attrs` | `object` | Alias for `attr` |

## Replace a Tag

```ts
const nizel = useNizel({
  elements: {
    strong: { tag: 'b' },
    em: { tag: 'i' },
  },
});
```

## Add Attributes

```ts
const nizel = useNizel({
  elements: {
    a: { attr: { target: '_blank', rel: 'noopener noreferrer' } },
    img: { attr: { loading: 'lazy' } },
  },
});
```

## Supported Elements

All standard Markdown elements can be customized:

- Headings: `h1` through `h6`
- Block: `p`, `blockquote`, `pre`, `ul`, `ol`, `li`
- Inline: `a`, `strong`, `em`, `code`, `del`
- Media: `img`
- Other: `hr`, `br`, `table`, `thead`, `tbody`, `tr`, `th`, `td`

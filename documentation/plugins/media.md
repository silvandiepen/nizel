---
title: Media
icon: ui/paint-brush
---

# Media

`nizel-plugin-media` enhances standalone images by wrapping them in figures and adding native-friendly image attributes.

## Usage

```ts
import { useNizel } from 'nizel';
import { mediaPlugin } from 'nizel-plugin-media';

const nizel = useNizel({ plugins: [mediaPlugin()] });
```

## Preview

![Nizel icon](/media/icon.svg)

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `lazy` | `boolean` | `true` | Add `loading="lazy"` to standalone images when missing. |
| `responsive` | `boolean` | `true` | Add `decoding="async"` to standalone images when missing. |
| `figureClassName` | `string` | `'media-figure'` | CSS class for generated figures. |

Only images that are the only content in a paragraph are wrapped in `<figure>`.

Browser IIFE: `NizelMedia` from `dist/media.iife.js`.

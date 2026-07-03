---
title: Heading Anchors
icon: ui/link
---

# Heading Anchors

`nizel-plugin-heading-anchors` appends visible anchor links to headings with generated IDs.

## Usage

```ts
import { useNizel } from 'nizel';
import { headingAnchorsPlugin } from 'nizel-plugin-heading-anchors';

const nizel = useNizel({ plugins: [headingAnchorsPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'heading-anchor'` | CSS class for the generated anchor. |
| `label` | `string` | `'#'` | Visible marker appended to the heading. |

Only headings with generated IDs receive anchors.

Browser IIFE: `NizelHeadingAnchors` from `dist/heading-anchors.iife.js`.

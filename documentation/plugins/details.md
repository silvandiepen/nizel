---
title: Details
icon: ui/list
---

# Details

`nizel-plugin-details` adds disclosure blocks:

```md
:::details More
Hidden **content**.
:::
```

## Usage

```ts
import { useNizel } from 'nizel';
import { detailsPlugin } from 'nizel-plugin-details';

const nizel = useNizel({ plugins: [detailsPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'details'` | CSS class for the generated `<details>` element. |

If the block has no summary, the plugin renders `Details`.

Browser IIFE: `NizelDetails` from `dist/details.iife.js`.

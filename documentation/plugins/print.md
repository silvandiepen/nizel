---
title: Print
description: Print and PDF layout controls for Nizel.
icon: ui/file-lines
---

# Print

`nizel-plugin-print` adds block directives for page breaks, print-only content, screen-only content, and page split control.

## Install

```bash
npm install nizel-plugin-print
```

## Usage

```ts
import { useNizel } from 'nizel';
import { printPlugin } from 'nizel-plugin-print';
import 'nizel-plugin-print/style.css';

const nizel = useNizel({
  plugins: [printPlugin()],
});
```

## Preview

<div class="nizel-print-only"><p>This note appears in print/PDF output.</p></div>

<div class="nizel-keep"><p>This block is marked to avoid page splits.</p></div>

## Syntax

```md
:::pagebreak
:::

:::pagebreak-before
# New section
:::

:::pagebreak-after
End of section.
:::

:::keep
This block should avoid splitting across pages.
:::

:::print-only
This content only appears in print/PDF.
:::

:::screen-only
This content only appears on screen.
:::

:::no-print
This content is hidden when printing.
:::

:::print-wide
This block may use wider print layout.
:::
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `injectCss` | `boolean` | `true` | Prepends the default print CSS in rendered HTML. |
| `collectMetadata` | `boolean` | `true` | Adds controls to `result.meta.print.controls`. |
| `classPrefix` | `string` | `'nizel'` | Prefix used for generated classes. |

## Metadata

```ts
{
  print: {
    controls: [
      { type: 'pagebreak' },
      { type: 'keep' }
    ],
    settings: {
      title: 'Markdown Plugin Guide',
      pageSize: 'A4'
    }
  }
}
```

The plugin ships minimal print CSS and does not set margins, page size, colors, or typography.

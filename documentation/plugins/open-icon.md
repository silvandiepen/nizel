---
title: Open Icon
description: Inline SVG icons from the local Open Icon catalog.
icon: ui/star
---

# Open Icon

`nizel-plugin-open-icon` renders Open Icon SVGs from the installed `open-icon` package.

It does not call the Open Icon API, fetch remote URLs, or make Markdown rendering depend on network access.

## Install

```bash
npm install nizel-plugin-open-icon open-icon
```

## Usage

```ts
import { useNizel } from 'nizel';
import { openIconPlugin } from 'nizel-plugin-open-icon';
import 'nizel-plugin-open-icon/style.css';

const nizel = useNizel({
  plugins: [openIconPlugin()],
});
```

## Preview

<span class="nizel-open-icon" data-icon="ui/search-m" aria-hidden="true"><svg id="search-m" viewBox="0 0 72 72"><circle cx="32.4" cy="32.4" r="14.4" style="fill: none; stroke: currentColor; stroke-width: 5;"/><line x1="54" y1="54" x2="42.58" y2="42.58" style="stroke: currentColor; stroke-width: 5;"/></svg></span>
Search

## Syntax

```md
:open-icon(ui/search-m)
:open-icon(ui/check-m, label="Success")
:open-icon(ui/search-m, size="1.25em")
:open-icon(ui/search-m, color="currentColor")
:open-icon(ui/search-m, strokeWidth=2)
```

Only `:open-icon(...)` is supported. Generic `:icon(...)` remains available for future multi-library plugins.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'inline-svg' \| 'semantic'` | `'inline-svg'` | Render local SVG markup or app-owned semantic spans. |
| `className` | `string` | `'nizel-open-icon'` | Wrapper class. |
| `defaultSize` | `number \| string` | `'1em'` | Default inherited icon size. |
| `defaultColor` | `string` | - | Optional default color. |
| `aliases` | `Record<string, string>` | `{}` | Maps shorthand names to catalog names. |
| `validateIcons` | `boolean` | `true` | Checks the local catalog. |
| `collectMetadata` | `boolean` | `true` | Adds icon usage to `result.meta.openIcon.icons`. |
| `strict` | `boolean` | `false` | Throws for invalid or missing icons. |

## Metadata

```ts
{
  openIcon: {
    icons: [
      { name: 'ui/search-m', original: 'search', label: 'Search', options: {} }
    ]
  }
}
```

The plugin escapes labels, classes, attributes, and SVG transform values before rendering.

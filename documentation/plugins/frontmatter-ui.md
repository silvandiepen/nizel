---
title: Frontmatter UI
icon: ui/file-lines
---

# Frontmatter UI

`nizel-plugin-frontmatter-ui` provides helpers for rendering metadata as UI. Core Nizel already parses frontmatter; this plugin is for display.

## Usage

```ts
import { renderFrontmatterMeta } from 'nizel-plugin-frontmatter-ui';

const html = renderFrontmatterMeta({ title: 'Doc', tags: ['one', 'two'] });
```

It also supports `::frontmatter` custom blocks.

```md
::frontmatter
title: Markdown Kitchen Sink
author: Lezin Renderer Test
::
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'frontmatter'` | CSS class for the generated `<dl>`. |

Browser IIFE: `NizelFrontmatterUi` from `dist/frontmatter-ui.iife.js`.

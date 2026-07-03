---
title: GFM Preset
icon: ui/puzzle
---

# GFM Preset

`nizel-plugin-gfm` is a convenience preset for GFM-oriented companion plugins. Core Nizel already includes GFM-like tables, task list metadata, strikethrough, and autolinks.

## Usage

```ts
import { useNizel } from 'nizel';
import { gfmPlugins } from 'nizel-plugin-gfm';

const nizel = useNizel({ plugins: gfmPlugins() });
```

## Preview

- [x] Render task-list checkboxes
- [ ] Keep bare links active: https://example.com

::note GFM callout
The preset also includes alert blocks.
::

## Included Plugins

- `nizel-plugin-autolink`
- `nizel-plugin-alert`
- `nizel-plugin-task-list`

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `alerts` | `boolean` | `true` | Include GitHub-style alert support. |
| `autolinks` | `boolean` | `true` | Include configurable bare URL and email autolinks. |
| `taskLists` | `boolean \| TaskListPluginOptions` | `true` | Include task-list checkbox rendering. |

Browser IIFE: `NizelGfm` from `dist/gfm.iife.js`.

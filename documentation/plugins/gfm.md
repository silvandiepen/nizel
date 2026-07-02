---
title: GFM Preset
---

# GFM Preset

`nizel-plugin-gfm` is a convenience preset for GFM-oriented companion plugins. Core Nizel already includes GFM-like tables, task list metadata, strikethrough, and autolinks.

## Usage

```ts
import { useNizel } from 'nizel';
import { gfmPlugins } from 'nizel-plugin-gfm';

const nizel = useNizel({ plugins: gfmPlugins() });
```

## Included Plugins

- `nizel-plugin-autolink`
- `nizel-plugin-alert`

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `alerts` | `boolean` | `true` | Include GitHub-style alert support. |
| `autolinks` | `boolean` | `true` | Include configurable bare URL and email autolinks. |

Browser IIFE: `NizelGfm` from `dist/gfm.iife.js`.

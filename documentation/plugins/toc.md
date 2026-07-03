---
title: Table of Contents
icon: ui/list
---

# Table of Contents

`nizel-plugin-toc` renders `[[toc]]` from document headings.

```md
[[toc]]

## Section
```

## Preview

[[toc]]

## Usage

```ts
import { useNizel } from 'nizel';
import { tocPlugin } from 'nizel-plugin-toc';

const nizel = useNizel({ plugins: [tocPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'toc'` | CSS class for the generated `<nav>`. |
| `minDepth` | `number` | `2` | Minimum heading depth included. |
| `maxDepth` | `number` | `6` | Maximum heading depth included. |

The marker must be on its own line.

Browser IIFE: `NizelToc` from `dist/toc.iife.js`.

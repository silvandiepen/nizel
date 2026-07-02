---
title: Footnotes
---

# Footnotes

`nizel-plugin-footnotes` renders `[^id]` references and definitions.

```md
Text.[^a]

[^a]: Footnote text.
```

## Usage

```ts
import { useNizel } from 'nizel';
import { footnotesPlugin } from 'nizel-plugin-footnotes';

const nizel = useNizel({ plugins: [footnotesPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'footnotes'` | CSS class for the generated footnotes section. |

Definitions are collected and appended at the end of the rendered document. Unknown references remain unchanged.

Browser IIFE: `NizelFootnotes` from `dist/footnotes.iife.js`.

---
title: Abbreviations
---

# Abbreviations

`nizel-plugin-abbr` renders abbreviation definitions such as:

```md
*[HTML]: HyperText Markup Language

HTML is text.
```

## Usage

```ts
import { useNizel } from 'nizel';
import { abbrPlugin } from 'nizel-plugin-abbr';

const nizel = useNizel({ plugins: [abbrPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `definitions` | `Record<string, string>` | `{}` | Additional abbreviation definitions merged with definitions from the Markdown file. |

Definitions are removed from the rendered document. Matching terms are rendered as `<abbr title="...">...</abbr>`.

Browser IIFE: `NizelAbbr` from `dist/abbr.iife.js`.

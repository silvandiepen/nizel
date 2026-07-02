---
title: Typography
---

# Typography

`nizel-plugin-typography` adds optional inline typography extensions:

- `==mark==`
- `H~2~O`
- `x^2^`

## Usage

```ts
import { useNizel } from 'nizel';
import { typographyPlugin } from 'nizel-plugin-typography';

const nizel = useNizel({ plugins: [typographyPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mark` | `boolean` | `true` | Enable `==mark==` output. |
| `subscript` | `boolean` | `true` | Enable `~sub~` output. |
| `superscript` | `boolean` | `true` | Enable `^sup^` output. |

Browser IIFE: `NizelTypography` from `dist/typography.iife.js`.

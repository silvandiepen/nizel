---
title: Math
icon: ui/curly-braces
---

# Math

`nizel-plugin-math` wraps inline `$math$` and display `$$` math for a host renderer such as KaTeX or MathJax.

```md
Inline $E = mc^2$

$$
f(x) = x^2
$$
```

## Preview

Inline $E = mc^2$

$$
f(x) = x^2
$$

## Usage

```ts
import { useNizel } from 'nizel';
import { mathPlugin } from 'nizel-plugin-math';

const nizel = useNizel({ plugins: [mathPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `inlineClassName` | `string` | `'math math-inline'` | CSS class for inline math spans. |
| `blockClassName` | `string` | `'math math-display'` | CSS class for display math blocks. |

This plugin preserves TeX source. Render it with KaTeX, MathJax, or native host code if you need visual math layout.

Browser IIFE: `NizelMath` from `dist/math.iife.js`.

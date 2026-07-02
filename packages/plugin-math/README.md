# nizel-plugin-math

Math wrappers for [Nizel](https://npmjs.com/package/nizel).

This plugin preserves TeX source in HTML wrappers. Rendering with KaTeX or MathJax can be applied by the host app.

The browser build exposes `NizelMath` from `dist/math.iife.js`.

## Install

```bash
npm install nizel-plugin-math
```

## Usage

```ts
import { useNizel } from 'nizel';
import { mathPlugin } from 'nizel-plugin-math';

const nizel = useNizel({
  plugins: [mathPlugin()],
});
```

## Syntax

```md
Inline math: $E = mc^2$

$$
f(x) = x^2
$$
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `inlineClassName` | `string` | `'math math-inline'` | CSS class for inline math spans. |
| `blockClassName` | `string` | `'math math-display'` | CSS class for display math blocks. |

## Output

```html
<span class="math math-inline">E = mc^2</span>
<div class="math math-display">f(x) = x^2</div>
```

## License

MIT

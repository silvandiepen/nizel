# nizel-plugin-typography

Inline typography extensions for [Nizel](https://npmjs.com/package/nizel).

The plugin adds small, explicit inline extensions that are common in writing apps but not part of pure Markdown: mark/highlight, subscript, and superscript.

The browser build exposes `NizelTypography` from `dist/typography.iife.js`.

## Install

```bash
npm install nizel-plugin-typography
```

## Usage

```ts
import { useNizel } from 'nizel';
import { typographyPlugin } from 'nizel-plugin-typography';

const nizel = useNizel({
  plugins: [typographyPlugin()],
});
```

## Syntax

```md
==highlighted text==
H~2~O
E = mc^2^
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mark` | `boolean` | `true` | Enable `==mark==` output. |
| `subscript` | `boolean` | `true` | Enable `~sub~` output. |
| `superscript` | `boolean` | `true` | Enable `^sup^` output. |

## Output

```html
<mark>highlighted text</mark>
H<sub>2</sub>O
E = mc<sup>2</sup>
```

## License

MIT

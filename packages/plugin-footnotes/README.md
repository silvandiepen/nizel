# nizel-plugin-footnotes

Footnote references and definitions for [Nizel](https://npmjs.com/package/nizel).

The plugin converts `[^id]` references into linked superscripts, removes footnote definition lines from the document body, and appends a footnotes section.

The browser build exposes `NizelFootnotes` from `dist/footnotes.iife.js`.

## Install

```bash
npm install nizel-plugin-footnotes
```

## Usage

```ts
import { useNizel } from 'nizel';
import { footnotesPlugin } from 'nizel-plugin-footnotes';

const nizel = useNizel({
  plugins: [footnotesPlugin()],
});
```

## Syntax

```md
This sentence has a note.[^simple]

[^simple]: This is the footnote text.
```

Unknown references are left untouched.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'footnotes'` | CSS class for the generated footnotes section. |

## Output

```html
<sup id="fnref-simple"><a href="#fn-simple" class="footnote-ref">1</a></sup>
<section class="footnotes"><ol><li id="fn-simple">...</li></ol></section>
```

## License

MIT

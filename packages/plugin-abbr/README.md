# nizel-plugin-abbr

Abbreviation definitions for [Nizel](https://npmjs.com/package/nizel).

The plugin removes abbreviation definition lines from the Markdown body and renders matching terms as `<abbr title="...">...</abbr>` in paragraphs, headings, lists, blockquotes, and custom blocks.

The browser build exposes `NizelAbbr` from `dist/abbr.iife.js`.

## Install

```bash
npm install nizel-plugin-abbr
```

## Usage

```ts
import { useNizel } from 'nizel';
import { abbrPlugin } from 'nizel-plugin-abbr';

const nizel = useNizel({
  plugins: [abbrPlugin()],
});
```

## Syntax

```md
*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

HTML and CSS work together.
```

Definitions can also be supplied from options when the source document should not contain definition lines.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `definitions` | `Record<string, string>` | `{}` | Additional abbreviation definitions merged with document definitions. |

## Output

```html
<p><abbr title="HyperText Markup Language">HTML</abbr> is a markup language.</p>
```

## License

MIT

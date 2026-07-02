# nizel-plugin-citations

Citation references and bibliography output for [Nizel](https://npmjs.com/package/nizel).

The plugin recognizes inline references such as `[@doe]`, removes citation definition lines from the document body, and appends a bibliography section at the end of the rendered document.

The browser build exposes `NizelCitations` from `dist/citations.iife.js`.

## Install

```bash
npm install nizel-plugin-citations
```

## Usage

```ts
import { useNizel } from 'nizel';
import { citationsPlugin } from 'nizel-plugin-citations';

const nizel = useNizel({
  plugins: [citationsPlugin()],
});
```

## Syntax

```md
This sentence cites a source [@smith2026].

[@smith2026]: Smith, A. Markdown Rendering Notes, 2026.
```

Unknown citation IDs are left as text.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'citations'` | CSS class for the generated bibliography section. |

## Output

```html
<a class="citation" href="#cite-smith2026">[smith2026]</a>
<section class="citations"><ol><li id="cite-smith2026">...</li></ol></section>
```

## License

MIT

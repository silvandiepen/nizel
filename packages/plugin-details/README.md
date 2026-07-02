# nizel-plugin-details

Disclosure block support for [Nizel](https://npmjs.com/package/nizel).

The plugin converts `:::details` fenced blocks into Nizel custom blocks and renders them as native HTML `<details>` / `<summary>` markup.

The browser build exposes `NizelDetails` from `dist/details.iife.js`.

## Install

```bash
npm install nizel-plugin-details
```

## Usage

```ts
import { useNizel } from 'nizel';
import { detailsPlugin } from 'nizel-plugin-details';

const nizel = useNizel({
  plugins: [detailsPlugin()],
});
```

## Syntax

```md
:::details Click to expand
Hidden **Markdown** content.

- Nested content works
:::
```

If no summary is supplied, the plugin uses `Details`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'details'` | CSS class for the generated `<details>` element. |

## Output

```html
<details class="details"><summary>Click to expand</summary>...</details>
```

## License

MIT

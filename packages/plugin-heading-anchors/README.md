# nizel-plugin-heading-anchors

Visible heading anchor links for [Nizel](https://npmjs.com/package/nizel).

The plugin appends a linked marker to parsed headings that already have generated IDs. It is useful for documentation and long-form pages that need copyable section links.

The browser build exposes `NizelHeadingAnchors` from `dist/heading-anchors.iife.js`.

## Install

```bash
npm install nizel-plugin-heading-anchors
```

## Usage

```ts
import { useNizel } from 'nizel';
import { headingAnchorsPlugin } from 'nizel-plugin-heading-anchors';

const nizel = useNizel({
  plugins: [headingAnchorsPlugin()],
});
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'heading-anchor'` | CSS class for the generated anchor. |
| `label` | `string` | `'#'` | Visible marker text appended to the heading. |

## Output

```html
<h2 id="install">Install<a class="heading-anchor" href="#install" aria-hidden="true">#</a></h2>
```

## License

MIT

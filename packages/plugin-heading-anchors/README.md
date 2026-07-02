# nizel-plugin-heading-anchors

Subtle heading anchor links for [Nizel](https://npmjs.com/package/nizel).

The plugin appends a copyable section link to parsed headings that already have generated IDs. By default the link has no visible text, so apps can reveal it with CSS on hover or focus without adding a literal marker to the heading content.

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
| `label` | `string` | `''` | Optional visible marker text appended to the heading. |
| `ariaLabel` | `string` | `'Link to section'` | Accessible label for the generated anchor. |

## Output

```html
<h2 id="install">Install<a class="heading-anchor" href="#install" aria-label="Link to section"></a></h2>
```

## License

MIT

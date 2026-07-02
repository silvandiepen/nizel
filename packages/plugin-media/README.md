# nizel-plugin-media

Media and figure rendering helpers for [Nizel](https://npmjs.com/package/nizel).

The plugin enhances standalone image paragraphs after rendering. It wraps them in `<figure>`, copies the image `alt` text into a `<figcaption>`, and can add lazy/responsive image attributes.

The browser build exposes `NizelMedia` from `dist/media.iife.js`.

## Install

```bash
npm install nizel-plugin-media
```

## Usage

```ts
import { useNizel } from 'nizel';
import { mediaPlugin } from 'nizel-plugin-media';

const nizel = useNizel({
  plugins: [mediaPlugin()],
});
```

## Syntax

```md
![Figure caption](https://example.com/image.png)
```

Only standalone images wrapped in their own paragraph are converted into figures. Inline images remain inline.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `lazy` | `boolean` | `true` | Add `loading="lazy"` when missing. |
| `responsive` | `boolean` | `true` | Add `decoding="async"` when missing. |
| `figureClassName` | `string` | `'media-figure'` | CSS class for generated figures. |

## Output

```html
<figure class="media-figure"><img ... loading="lazy" decoding="async" /><figcaption>Figure caption</figcaption></figure>
```

## License

MIT

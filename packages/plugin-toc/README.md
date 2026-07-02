# nizel-plugin-toc

Rendered table of contents support for [Nizel](https://npmjs.com/package/nizel).

The plugin converts a standalone `[[toc]]` marker into a linked `<nav>` built from parsed heading IDs.

The browser build exposes `NizelToc` from `dist/toc.iife.js`.

## Install

```bash
npm install nizel-plugin-toc
```

## Usage

```ts
import { useNizel } from 'nizel';
import { tocPlugin } from 'nizel-plugin-toc';

const nizel = useNizel({
  plugins: [tocPlugin()],
});
```

## Syntax

```md
[[toc]]

## Install

## Usage
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'toc'` | CSS class for the generated `<nav>`. |
| `minDepth` | `number` | `2` | Minimum heading depth included. |
| `maxDepth` | `number` | `6` | Maximum heading depth included. |

## Output

```html
<nav class="toc"><ol><li data-depth="2"><a href="#install">Install</a></li></ol></nav>
```

## License

MIT

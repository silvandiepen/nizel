# nizel-plugin-frontmatter-ui

Frontmatter-style metadata rendering helpers for [Nizel](https://npmjs.com/package/nizel).

This plugin registers a `::frontmatter` custom block and exports `renderFrontmatterMeta()` for apps that want to render document metadata with consistent definition-list markup.

The browser build exposes `NizelFrontmatterUi` from `dist/frontmatter-ui.iife.js`.

## Install

```bash
npm install nizel-plugin-frontmatter-ui
```

## Usage

```ts
import { useNizel } from 'nizel';
import { frontmatterUiPlugin } from 'nizel-plugin-frontmatter-ui';

const nizel = useNizel({
  plugins: [frontmatterUiPlugin()],
});
```

## Syntax

```md
::frontmatter
title: Markdown Kitchen Sink
author: Lezin Renderer Test
::
```

You can also pass block props when using Nizel custom block syntax.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'frontmatter'` | CSS class for the generated `<dl>`. |

## Output

```html
<dl class="frontmatter"><dt>title</dt><dd>Markdown Kitchen Sink</dd></dl>
```

## License

MIT

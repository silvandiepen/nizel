# nizel-plugin-print

Print and PDF layout controls for Nizel Markdown documents.

The plugin renders semantic wrapper elements for page breaks, print-only content, screen-only content, non-printing content, and blocks that should avoid splitting across pages.

## Installation

```bash
npm install nizel-plugin-print
```

## Usage

```ts
import { useNizel } from 'nizel';
import { printPlugin } from 'nizel-plugin-print';
import 'nizel-plugin-print/style.css';

const nizel = useNizel({
  plugins: [printPlugin()],
});

const html = await nizel.html(':::pagebreak\n:::');
```

The plugin can also inject its default CSS into rendered HTML:

```ts
printPlugin({
  injectCss: true,
  collectMetadata: true,
});
```

## Syntax

```md
:::pagebreak
:::

:::pagebreak-before
# New section
:::

:::pagebreak-after
End of section.
:::

:::keep
![Chart](./chart.png)

This chart and caption should stay together.
:::

:::print-only
Printed copy generated on 2026-07-03.
:::

:::screen-only
[Open interactive demo](./demo)
:::

:::no-print
This video is not included in the PDF.
:::

:::print-wide
| Very | Wide | Table |
|---|---|---|
| ... | ... | ... |
:::
```

## Output

`:::pagebreak` renders an empty structural break:

```html
<div class="nizel-pagebreak" aria-hidden="true"></div>
```

Other directives wrap their parsed Markdown content:

```html
<div class="nizel-print-only">
  <p>Printed copy generated on 2026-07-03.</p>
</div>
```

## Options

```ts
type PrintPluginOptions = {
  injectCss?: boolean;
  collectMetadata?: boolean;
  classPrefix?: string;
};
```

Defaults:

```ts
{
  injectCss: true,
  collectMetadata: true,
  classPrefix: 'nizel'
}
```

Set `injectCss: false` when importing `nizel-plugin-print/style.css` yourself.

## Styling

Import the default stylesheet when you want static CSS instead of injected CSS:

```ts
import 'nizel-plugin-print/style.css';
```

The stylesheet only defines print visibility and page-break behavior. It does not set page size, margins, colors, or typography.

## Metadata

With `collectMetadata: true`, render results include print controls:

```ts
const result = await nizel(':::pagebreak\n:::\n\n:::keep\nKeep this.\n:::');

console.log(result.meta.print);
```

```ts
{
  controls: [
    { type: 'pagebreak' },
    { type: 'keep' }
  ]
}
```

If frontmatter includes a `print` object, supported print settings are copied to `result.meta.print.settings`:

```yaml
---
print:
  title: Markdown Plugin Guide
  pageSize: A4
  orientation: portrait
  margins: normal
  showDate: true
  showUrl: true
---
```

The plugin exposes metadata for renderers and exporters. It does not set page size, margins, colors, or typography.

## Parser Exclusions

Print directives are ignored inside fenced code blocks and raw HTML blocks. Escaped directive syntax remains literal Markdown text.

## Security

The plugin renders only known print directive names and escapes generated class names. Directive content is parsed by Nizel using the active safe-rendering settings.

## Integration Example

```ts
const result = await nizel(':::print-only\nPrinted copy.\n:::');

console.log(result.html);
console.log(result.meta.print);
```

# nizel-style

Scoped CSS for rendered Markdown content and official Nizel plugins.

## Install

```sh
npm install nizel-style
```

## Full stylesheet

Import or link the complete stylesheet when you use the standard Nizel renderer and want plugin styles included.

```js
import 'nizel-style';
```

```html
<link rel="stylesheet" href="/node_modules/nizel-style/dist/nizel-style.css">
```

When compiling Sass, use the public Sass entrypoint:

```scss
@use "nizel-style/style";
```

Wrap rendered content with one of the supported roots:

```html
<article class="nizel-content">
  <!-- rendered Nizel HTML -->
</article>
```

The root selector also supports `[data-nizel-content]` and `.nizel-prose`.

The base layer targets ordinary rendered Markdown HTML such as headings, paragraphs, lists, blockquotes, code, images, and tables. It can style HTML from Nizel, `marked`, `markdown-it`, CMS content, or another Markdown renderer as long as the content is wrapped in a supported root. Plugin styles are the Nizel-specific layer.

## Partial styles

Load only the pieces you use:

```js
import 'nizel-style/tokens.css';
import 'nizel-style/base.css';
import 'nizel-style/plugins/alert.css';
import 'nizel-style/plugins/code-copy.css';
import 'nizel-style/plugins/task-list.css';
```

Available plugin styles:

- `nizel-style/plugins/abbr.css`
- `nizel-style/plugins/alert.css`
- `nizel-style/plugins/citations.css`
- `nizel-style/plugins/code-copy.css`
- `nizel-style/plugins/deflist.css`
- `nizel-style/plugins/details.css`
- `nizel-style/plugins/diagrams.css`
- `nizel-style/plugins/footnotes.css`
- `nizel-style/plugins/frontmatter-ui.css`
- `nizel-style/plugins/heading-anchors.css`
- `nizel-style/plugins/hidden-comments.css`
- `nizel-style/plugins/math.css`
- `nizel-style/plugins/media.css`
- `nizel-style/plugins/shiki.css`
- `nizel-style/plugins/task-list.css`
- `nizel-style/plugins/toc.css`
- `nizel-style/plugins/typography.css`

## Theme variables

Set variables on `:root`, a theme container, or directly on `.nizel-content`.

```css
.nizel-content {
  --nizel-foreground: #1f2328;
  --nizel-background: #ffffff;
  --nizel-primary: #2563eb;
  --nizel-secondary: #7c3aed;
  --nizel-error: #b42318;
  --nizel-info: #0969da;
  --nizel-font-body: Inter, system-ui, sans-serif;
  --nizel-font-heading: Inter, system-ui, sans-serif;
  --nizel-font-code: "SF Mono", Menlo, Monaco, monospace;
}
```

The token layer falls back to common app tokens such as `--foreground`, `--background`, `--primary`, `--secondary`, `--error`, and `--info`.

The package source is Sass and the published `dist` files are compiled CSS. Spacing tokens use `--nizel-space-xxs`, `--nizel-space-xs`, `--nizel-space-s`, `--nizel-space`, `--nizel-space-l`, `--nizel-space-xl`, and `--nizel-space-xxl`, all expressed in `em` so the layout scales with the content font size.

## Rhythm presets

For rendered Markdown, the main reading rhythm is controlled by three variables:

```css
.nizel-content {
  --nizel-size: 1em;
  --nizel-leading: 1.66;
  --nizel-flow: 1.35em;
}
```

- `--nizel-size` controls the base content font size.
- `--nizel-leading` controls the base line height.
- `--nizel-flow` controls the space between adjacent blocks. Section spacing derives from this value.

The older aliases still work through the same system: `--nizel-font-size`, `--nizel-line-height`, and `--nizel-flow-space`.

Use a preset class or data attribute when the same renderer appears in different contexts:

```html
<div class="nizel-content nizel-compact">Chat output</div>
<article class="nizel-content nizel-docs">Documentation</article>
<article class="nizel-content nizel-reading">Long-form article</article>
<article class="nizel-content nizel-large">Large text mode</article>
```

```html
<article class="nizel-content" data-nizel-preset="docs">
  <!-- rendered Markdown HTML -->
</article>
```

## Defaults

Code blocks use a flat surface without a border by default. Override `--nizel-code-block-background` or `--nizel-code-block-radius` on the root to tune the treatment.

Tables use minimal horizontal separators instead of boxed cells, which keeps dense documentation and generated Markdown readable without making every cell feel like an input grid.

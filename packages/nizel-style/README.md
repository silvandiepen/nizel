# nizel-style

Scoped CSS for rendered Nizel content and official plugins.

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

Wrap rendered content with one of the supported roots:

```html
<article class="nizel-content">
  <!-- rendered Nizel HTML -->
</article>
```

The root selector also supports `[data-nizel-content]` and `.nizel-prose`.

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

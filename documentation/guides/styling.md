---
title: Styling
description: Use nizel-style to style rendered Nizel content.
icon: ui/palette
order: 11
---

# Styling

`nizel-style` ships scoped CSS for rendered Nizel content and official plugin output.

Use it when you want Nizel HTML to be styled directly without writing application-specific selectors for every Markdown and plugin element.

## Install

```bash
npm install nizel-style
```

## Full Stylesheet

Import the complete stylesheet when you want core content styles and all first-party plugin styles.

```ts
import 'nizel-style';
```

Or link the compiled CSS:

```html
<link rel="stylesheet" href="/node_modules/nizel-style/dist/nizel-style.css">
```

Wrap rendered output with a supported scope:

```html
<article class="nizel-content">
  <!-- rendered Nizel HTML -->
</article>
```

The same styles also target `[data-nizel-content]` and `.nizel-prose`.

## Partial Styles

Load only the CSS for the plugins you use.

```ts
import 'nizel-style/tokens.css';
import 'nizel-style/base.css';
import 'nizel-style/plugins/alert.css';
import 'nizel-style/plugins/code-copy.css';
import 'nizel-style/plugins/shiki.css';
import 'nizel-style/plugins/task-list.css';
```

Available plugin entrypoints:

| Plugin | CSS |
| --- | --- |
| Abbreviations | `nizel-style/plugins/abbr.css` |
| Alerts | `nizel-style/plugins/alert.css` |
| Citations | `nizel-style/plugins/citations.css` |
| Code Copy | `nizel-style/plugins/code-copy.css` |
| Definition Lists | `nizel-style/plugins/deflist.css` |
| Details | `nizel-style/plugins/details.css` |
| Diagrams | `nizel-style/plugins/diagrams.css` |
| Footnotes | `nizel-style/plugins/footnotes.css` |
| Frontmatter UI | `nizel-style/plugins/frontmatter-ui.css` |
| Heading Anchors | `nizel-style/plugins/heading-anchors.css` |
| Math | `nizel-style/plugins/math.css` |
| Media | `nizel-style/plugins/media.css` |
| Shiki | `nizel-style/plugins/shiki.css` |
| Task Lists | `nizel-style/plugins/task-list.css` |
| Table of Contents | `nizel-style/plugins/toc.css` |
| Typography | `nizel-style/plugins/typography.css` |

## Theme Tokens

Set tokens on `:root`, a theme container, or directly on the content scope.

```css
.nizel-content {
  --nizel-foreground: #1f2328;
  --nizel-background: #ffffff;
  --nizel-surface: #f6f8fa;
  --nizel-border: #d0d7de;
  --nizel-primary: #2563eb;
  --nizel-secondary: #7c3aed;
  --nizel-error: #b42318;
  --nizel-info: #0969da;
  --nizel-success: #1a7f37;
  --nizel-warning: #9a6700;
  --nizel-font-body: Inter, system-ui, sans-serif;
  --nizel-font-heading: Inter, system-ui, sans-serif;
  --nizel-font-code: "SF Mono", Menlo, Monaco, monospace;
}
```

The token layer falls back to common app tokens such as `--foreground`, `--background`, `--primary`, `--secondary`, `--error`, and `--info`.

## Spacing

Spacing is based on named `em` tokens so rendered content scales with its font size.

```css
.nizel-content {
  --nizel-space-xxs: 0.2em;
  --nizel-space-xs: 0.35em;
  --nizel-space-s: 0.65em;
  --nizel-space: 1em;
  --nizel-space-l: 1.35em;
  --nizel-space-xl: 1.8em;
  --nizel-space-xxl: 2.6em;
}
```

Plugin styles use those variables instead of hard-coded spacing values.

## Preview

The package includes a Markdown-backed preview fixture in `packages/nizel-style/preview.md`.

```bash
npm run preview:build --workspace nizel-style
```

Open `packages/nizel-style/preview.html` to inspect the rendered output.

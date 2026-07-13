---
title: Hidden Comments
description: Render Markdown HTML comments as controlled, reversible Nizel content.
icon: ui/message-dots
---

# Hidden Comments

`nizel-plugin-hidden-comments` controls how Markdown HTML comments render. It can keep comments in the generated HTML for copy/PDF workflows, show them as small reviewer notes, render them inline, or remove them entirely.

## Install

```bash
npm install nizel-plugin-hidden-comments
```

## Usage

```ts
import { useNizel } from 'nizel';
import { hiddenCommentsPlugin } from 'nizel-plugin-hidden-comments';

const nizel = useNizel({
  plugins: [hiddenCommentsPlugin({ mode: 'hide' })],
});

const html = await nizel.html('Visible <!-- internal note --> text');
```

## Modes

| Mode | Behavior |
| --- | --- |
| `hide` | Renders a visually hidden span that keeps the comment text copyable and available to PDF text layers. |
| `small` | Renders the comment as small muted inline text. |
| `render` | Renders the comment inline at the normal text size. |
| `remove` | Removes Markdown comments from rendered output. |

## Reverse Conversion

The plugin also contributes an HTML-to-Markdown handler. Hidden comment spans created by the plugin convert back to Markdown comments:

```ts
const markdown = nizel.htmlToMarkdown(html, {
  plugins: [hiddenCommentsPlugin()],
});
```

`nizel-kit` automatically wires enabled plugins into reverse conversion, so native apps can round-trip selected hidden-comment output by enabling the `hidden-comments` plugin ID.

## Styling

The plugin does not inject CSS by default. Load the standard style package when using the default class names:

```ts
import 'nizel-style/plugins/hidden-comments.css';
```

For standalone output, pass `injectCss: true`:

```ts
hiddenCommentsPlugin({ injectCss: true });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'hide' \| 'small' \| 'render' \| 'remove'` | `'hide'` | Controls how comments appear in rendered HTML. |
| `injectCss` | `boolean` | `false` | Prepends minimal CSS to the generated HTML. |
| `className` | `string` | `'nizel-hidden-comment'` | Base class used for generated spans. |

Browser IIFE: `NizelHiddenComments` from `dist/hidden-comments.iife.js`.

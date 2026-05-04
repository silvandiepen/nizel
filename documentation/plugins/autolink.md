---
title: Autolinks
description: Configure bare URL and email autolink behavior for Nizel.
icon: ui/link
order: 2
---

# Autolinks

`nizel-plugin-autolink` configures Nizel's built-in conversion of bare URLs and email addresses into links.

## Install

```bash
npm install nizel-plugin-autolink
```

## Usage

```ts
import { useNizel } from 'nizel';
import { autolinkPlugin } from 'nizel-plugin-autolink';

const nizel = useNizel({
  plugins: [
    autolinkPlugin({
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  ],
});

const html = await nizel.html('Visit https://example.com');
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Enables or disables autolinking. |
| `target` | `string` | - | `target` attribute for generated links. |
| `rel` | `string` | - | `rel` attribute for generated links. |

## Output

```html
<p>Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a></p>
```

Use this plugin when you want autolink behavior to be packaged and shared with the rest of your plugin setup.

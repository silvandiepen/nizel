---
title: Alerts
description: GitHub-style alert callout blocks for Nizel.
icon: ui/message
order: 1
---

# Alerts

`nizel-plugin-alert` adds GitHub-style callout blocks for notes, tips, important notices, warnings, and cautions.

## Install

```bash
npm install nizel-plugin-alert
```

## Usage

```ts
import { useNizel } from 'nizel';
import { alertPlugin } from 'nizel-plugin-alert';

const nizel = useNizel({
  plugins: [alertPlugin()],
});

const html = await nizel.html(`::warning Careful
Pay **attention**.
::`);
```

## Syntax

Use one of the supported block names:

- `note`
- `tip`
- `important`
- `warning`
- `caution`

The first argument becomes the alert title.

```md
::tip Helpful
Use Markdown inside the alert body.
::
```

You can also pass the title as a block prop.

```md
::tip
title: Helpful
::
Use Markdown inside the alert body.
::
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'alert'` | Root CSS class used for the generated alert markup. |

## Output

```html
<div class="alert alert--warning" data-alert="warning">
  <p class="alert__title">Careful</p>
  <div class="alert__content">...</div>
</div>
```

The plugin escapes title text and attributes before rendering.

---
title: Sanitize
icon: ui/shield
---

# Sanitize

`nizel-plugin-sanitize` removes risky HTML from rendered output. It is enabled by default in `nizel-kit`.

## Usage

```ts
import { useNizel } from 'nizel';
import { sanitizePlugin } from 'nizel-plugin-sanitize';

const nizel = useNizel({ plugins: [sanitizePlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowRawHtml` | `boolean` | `false` | When `true`, disables Nizel's core safe rendering option while this plugin still strips its known risky patterns. |

The sanitizer removes script/style blocks, inline event handlers, and `javascript:` URLs. It is a deterministic hardening pass, not a replacement for platform-level WebView restrictions.

Browser IIFE: `NizelSanitize` from `dist/sanitize.iife.js`.

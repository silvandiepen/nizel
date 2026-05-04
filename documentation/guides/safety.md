---
title: Safety
icon: ui/shield
order: 12
---

# Safety

Safe output is enabled by default in Nizel.

## What Safe Mode Does

When `safe: true` (the default), Nizel sanitizes output to prevent injection:

- HTML in Markdown is escaped unless explicitly allowed
- Script tags are stripped
- Event handler attributes (`onclick`, `onerror`) are removed
- JavaScript URLs (`javascript:...`) are stripped from links

## Disable Safe Mode

Only disable safe mode when you trust the input source completely:

```ts
const nizel = useNizel({ safe: false });
```

This is useful for internal tools where the Markdown author is trusted and needs full HTML pass-through.

## Raw HTML Blocks

CommonMark supports raw HTML blocks. In safe mode, these are escaped:

```md
<div class="custom">
  This raw HTML is escaped in safe mode.
</div>
```

With `safe: false`, the HTML passes through unchanged.

## Inline HTML

Same behavior applies to inline HTML:

```md
This is <strong>inline HTML</strong> in a paragraph.
```

In safe mode, the `<strong>` tags are escaped. With `safe: false`, they render as HTML.

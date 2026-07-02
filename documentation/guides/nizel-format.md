---
title: Nizel Format
icon: ui/edit
order: 12
---

# Nizel Format

`nizel-format` formats Markdown source text. Use it when an app needs consistent Markdown before saving, syncing, or rendering.

It is separate from `nizel`, which renders Markdown to HTML. For Lezin, the formatter can run before a note is saved while Nizel or NizelKit can still render the preview.

## Command Line

Format a file in place:

```bash
npx nizel-format notes.md
```

Format all Markdown files in a directory:

```bash
npx nizel-format docs/
```

Check formatting in CI:

```bash
npx nizel-format --check README.md docs/
```

Read from stdin:

```bash
cat notes.md | npx nizel-format --stdin
```

## JavaScript

```ts
import { formatMarkdown } from 'nizel-format';

const formatted = formatMarkdown(markdown, {
  tables: true,
  unorderedListMarker: '-',
  nestedListIndent: 2,
});
```

## Native Apps

Build the package:

```bash
npm run build --workspace nizel-format
```

Load the IIFE bundle in a `WKWebView`, `JSContext`, or similar embedded JavaScript runtime:

```txt
packages/nizel-format/dist/nizel-format.iife.js
```

It exposes:

```js
NizelFormat.formatMarkdown(markdown)
```

The native app can pass Markdown in, receive formatted Markdown back, and save the returned string.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tables` | `boolean` | `true` | Align pipe tables. |
| `headingSpacing` | `boolean` | `true` | Normalize heading marker spacing. |
| `blankLines` | `boolean` | `true` | Normalize blank lines around block starts. |
| `unorderedListMarker` | `'-' \| '*' \| '+'` | `'-'` | Preferred unordered-list marker. |
| `nestedListIndent` | `2 \| 4` | `2` | Spaces per nested-list level. |
| `renumberOrderedLists` | `boolean` | `true` | Renumber ordered lists per nesting level. |
| `codeFenceMarker` | ``'```' \| '~~~'`` | ``'```'`` | Preferred code-fence marker. |
| `horizontalRule` | `'---' \| '***' \| '___'` | `'---'` | Preferred thematic-break marker. |
| `blockquoteSpacing` | `boolean` | `true` | Normalize blockquote marker spacing. |
| `htmlInlineTags` | `boolean` | `true` | Convert simple inline HTML emphasis tags to Markdown. |
| `imageShortcodes` | `boolean` | `true` | Convert `[img=url]` shortcodes to Markdown images. |
| `bbcode` | `boolean` | `true` | Convert common BBCode to Markdown. |

## Scope

`nizel-format` is intentionally deterministic and lightweight. It formats common Markdown authoring patterns, preserves frontmatter, and does not rewrite fenced code content.

It is not a full Markdown AST pretty-printer. Unsupported syntax is left alone rather than guessed.

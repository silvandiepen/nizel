# Nizel Format

`nizel-format` formats Markdown source text. Use it before saving or syncing Markdown in apps such as Lezin.

## CLI

```bash
npx nizel-format notes.md
npx nizel-format docs/
npx nizel-format --check README.md docs/
cat notes.md | npx nizel-format --stdin
```

File paths are formatted in place by default. `--check` reports files that would change and exits with code `1` when any differ.

## JavaScript

```ts
import { formatMarkdown } from 'nizel-format';

const formatted = formatMarkdown(markdown);
```

## Native Apps

Build the bundle:

```bash
npm run build --workspace nizel-format
```

Load:

```txt
packages/nizel-format/dist/nizel-format.iife.js
```

Call:

```js
NizelFormat.formatMarkdown(markdown)
```

## Scope

The formatter handles common Markdown cleanup: tables, heading spacing, blank lines, list markers, ordered-list numbers, code fences, horizontal rules, blockquote spacing, inline HTML emphasis cleanup, image shortcodes, and common BBCode.

It preserves frontmatter and fenced code content.

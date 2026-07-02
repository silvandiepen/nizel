# nizel-format

Markdown formatter utilities for Nizel.

Use it from JavaScript, native WebViews, or directly from the command line.

## CLI

Format a file in place:

```bash
npx nizel-format notes.md
```

Format every Markdown file in a directory:

```bash
npx nizel-format docs/
```

Check whether files are already formatted:

```bash
npx nizel-format --check README.md docs/
```

Format stdin to stdout:

```bash
cat notes.md | npx nizel-format --stdin
```

Print one formatted file without writing it:

```bash
npx nizel-format --stdout notes.md
```

### CLI Options

| Option | Description |
| --- | --- |
| `--check` | List files that would change and exit with code `1` when any differ. |
| `--stdout` | Print formatted output for one file instead of writing it. |
| `--stdin` | Read Markdown from stdin and print formatted output. |
| `--write` | Write files in place. This is the default for file paths. |
| `--unordered-list-marker=-` | Choose `-`, `*`, or `+`. |
| `--nested-list-indent=2` | Choose `2` or `4`. |
| `--code-fence-marker=\`\`\`` | Choose backticks or `~~~`. |
| `--horizontal-rule=---` | Choose `---`, `***`, or `___`. |
| `--no-tables` | Disable table alignment. |
| `--no-heading-spacing` | Disable heading marker spacing. |
| `--no-blank-lines` | Disable blank-line normalization. |
| `--no-renumber-ordered-lists` | Preserve ordered-list numbers. |
| `--no-blockquote-spacing` | Disable blockquote spacing. |
| `--no-html-inline-tags` | Disable inline HTML cleanup. |
| `--no-image-shortcodes` | Disable `[img=url]` conversion. |
| `--no-bbcode` | Disable BBCode conversion. |

## JavaScript API

```js
import { formatMarkdown } from 'nizel-format';

const formatted = formatMarkdown(markdown, {
  tables: true,
  unorderedListMarker: '-',
  nestedListIndent: 2,
});
```

## Browser and Native Apps

For native apps and WebViews, load `dist/nizel-format.iife.js` and call:

```js
const formatted = NizelFormat.formatMarkdown(markdown);
```

This is the shape Lezin can use from `WKWebView` or another embedded JavaScript runtime: pass the Markdown string in, receive the formatted Markdown string back, then save it in native storage.

## What It Formats

- Pipe table alignment
- Heading marker spacing
- Blank-line normalization
- Ordered-list renumbering
- Unordered-list marker normalization
- Nested-list indentation
- Fence marker normalization
- Horizontal-rule normalization
- Blockquote spacing
- Common inline HTML cleanup
- Common BBCode conversion
- `[img=url]` image shortcodes

Fenced code content and frontmatter are preserved.

## License

MIT

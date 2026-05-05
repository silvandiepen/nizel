# HTML to Markdown

Nizel exposes `htmlToMarkdown(html, options)` for importing semantic HTML into Markdown.

```ts
import { htmlToMarkdown } from 'nizel';

const markdown = htmlToMarkdown('<h1>Intro</h1><p>Hello <strong>world</strong>.</p>');
```

In browser code, import from `nizel/browser` when the source is already a DOM node, range, selection, or node list:

```ts
import { htmlToMarkdown, selectionToMarkdown } from 'nizel/browser';

const article = document.querySelector('article');
const markdown = article ? htmlToMarkdown(article) : '';
const selectedMarkdown = selectionToMarkdown();
```

The browser helper serializes DOM sources before handing them to the same conversion policy documented below.

## API

```ts
htmlToMarkdown(html: string, options?: NizelHtmlToMarkdownOptions): string
```

The `nizel/browser` overload also accepts browser sources:

```ts
htmlToMarkdown(source: string | Node | Range | Selection | ArrayLike<Node>, options?: NizelHtmlToMarkdownOptions): string
```

| Option | Type | Default | Description |
|---|---|---|---|
| `unsupported` | `'preserve' \| 'drop'` | `'preserve'` | Controls how HTML that Markdown cannot represent is handled. |

### `unsupported: 'preserve'`

This is the default. Nizel converts safe semantic equivalents and keeps unsupported or attribute-sensitive HTML as raw HTML.

Use this for migration tools, CMS imports, editor paste handling, and any workflow where losing attributes or custom structure would be worse than keeping raw HTML.

```ts
htmlToMarkdown('<p class="lead">Intro</p>');
// <p class="lead">Intro</p>
```

### `unsupported: 'drop'`

This mode emits more portable Markdown by removing unsupported tags and unsupported attributes. It keeps readable child text where possible.

Use this for plain Markdown targets where raw HTML is undesirable and lossy conversion is acceptable.

```ts
htmlToMarkdown('<p class="lead">Intro</p>', { unsupported: 'drop' });
// Intro
```

## Conversion Rules

Nizel converts these semantic HTML structures:

| HTML | Markdown output |
|---|---|
| `h1` through `h6` | ATX headings |
| `p` | paragraphs |
| `strong`, `b` | `**strong**` |
| `em`, `i` | `*emphasis*` |
| `del`, `s`, `strike` | `~~delete~~` |
| `code` | inline code |
| `pre`, `pre > code` | fenced code blocks |
| `a[href]` | links |
| `img[src]` | images |
| `blockquote` | blockquotes |
| `ul`, `ol`, `li` | lists |
| `hr` | thematic breaks |
| simple `table` markup | GFM tables |
| `div`, `main`, `section`, `article`, `header`, `footer`, `nav` without attributes | unwrapped block containers |
| `span` without attributes | unwrapped inline container |
| `br` | hard line breaks |

## Attribute Policy

Markdown cannot carry arbitrary HTML attributes. In default `preserve` mode, Nizel preserves an element as raw HTML when converting it would drop attributes.

Supported attributes that can be converted:

| Element | Supported attributes |
|---|---|
| `a` | `href`, `title` |
| `img` | `src`, `alt`, `title` |
| `ol` | `start` |
| `pre`, `code` | `class`, when it contains `language-*` |

Any other attribute marks the element as attribute-sensitive in `preserve` mode.

```ts
htmlToMarkdown('<a href="/docs" target="_blank">Docs</a>');
// <a href="/docs" target="_blank">Docs</a>
```

In `drop` mode, unsupported attributes are discarded and the element is converted when possible.

```ts
htmlToMarkdown('<a href="/docs" target="_blank">Docs</a>', { unsupported: 'drop' });
// [Docs](/docs)
```

## Tables

Only simple rectangular tables map cleanly to GFM table syntax. Nizel converts simple `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, and `td` structures.

Tables with cell attributes such as `colspan`, `rowspan`, or custom alignment are preserved as raw HTML in default mode because GFM tables cannot represent that structure.

```ts
htmlToMarkdown('<table><tr><th colspan="2">Name</th></tr></table>');
// <table><tr><th colspan="2">Name</th></tr></table>
```

In `drop` mode, Nizel emits the best simple table it can, even when table structure is lossy.

## Code

Inline code uses enough backticks to avoid conflicting with the code content. Fenced code blocks also grow their fence when the code contains triple backticks.

```ts
htmlToMarkdown('<pre><code>```nested```</code></pre>');
// ````
// ```nested```
// ````
```

For code blocks, `language-*` is read from `code.class` first and then from `pre.class`.

## Entities and Whitespace

Nizel decodes common named entities and numeric entities before emitting Markdown. HTML text whitespace is collapsed to the Markdown shape that most closely matches browser text rendering.

Block output is normalized to a stable form:

- no leading or trailing blank lines
- at most one blank line between blocks
- no trailing whitespace before newlines

## Parser Tolerance

The converter is intentionally dependency-free and tolerant rather than a full browser DOM implementation. It recognizes normal HTML tags, comments, declarations, processing instructions, and CDATA tokens.

Malformed or unmatched HTML is handled conservatively:

- unclosed unsupported elements are preserved as raw HTML in `preserve` mode
- unmatched closing tags are kept as text
- declarations, processing instructions, and CDATA are kept as source text

## Unsupported HTML

Markdown has no native representation for many HTML features:

- arbitrary attributes on otherwise semantic elements
- classes and ids on spans or divs
- custom elements
- forms and controls
- embedded media
- scripts and styles
- disclosure widgets and other interactive structures
- table cell spans and alignment beyond basic GFM tables

The default `preserve` mode keeps those constructs as raw HTML. The `drop` mode is intentionally lossy and best suited for plain-text publishing targets.

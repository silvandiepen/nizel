# AST Specification

Nizel uses a normalized AST as the central content model.

The AST is the contract between parsing, transforms, plugins, elements, blocks, renderers, and result extraction.

## Design goals

- predictable node shapes
- easy plugin authoring
- safe rendering
- framework-agnostic output
- no string-based post-processing
- clean transformation pipeline

## Base node

Every node should have a `type`.

```ts
type NizelNode =
  | NizelRootNode
  | NizelTextNode
  | NizelParagraphNode
  | NizelHeadingNode
  | NizelEmphasisNode
  | NizelStrongNode
  | NizelDeleteNode
  | NizelInlineCodeNode
  | NizelCodeNode
  | NizelLinkNode
  | NizelImageNode
  | NizelListNode
  | NizelListItemNode
  | NizelBlockquoteNode
  | NizelThematicBreakNode
  | NizelTableNode
  | NizelTableRowNode
  | NizelTableCellNode
  | NizelHtmlNode
  | NizelComponentNode
  | NizelCustomBlockNode;
```

## Root

```ts
type NizelRootNode = {
  type: 'root';
  children: NizelNode[];
};
```

## Text

```ts
type NizelTextNode = {
  type: 'text';
  value: string;
};
```

## Paragraph

```ts
type NizelParagraphNode = {
  type: 'paragraph';
  children: NizelInlineNode[];
};
```

## Heading

```ts
type NizelHeadingNode = {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  text: string;
  children: NizelInlineNode[];
};
```

Headings should generate stable `id` values when anchors are enabled.

## Emphasis

```ts
type NizelEmphasisNode = {
  type: 'emphasis';
  children: NizelInlineNode[];
};
```

## Strong

```ts
type NizelStrongNode = {
  type: 'strong';
  children: NizelInlineNode[];
};
```

## Delete

```ts
type NizelDeleteNode = {
  type: 'delete';
  children: NizelInlineNode[];
};
```

## Inline code

```ts
type NizelInlineCodeNode = {
  type: 'inlineCode';
  code: string;
};
```

Inline code should not be syntax-highlighted by default.

## Code block

```ts
type NizelCodeNode = {
  type: 'code';
  code: string;
  lang?: string;
  meta?: string;
  filename?: string;
  highlightLines?: number[];
};
```

Code copy buttons and syntax highlighting are plugin-owned.

## Link

```ts
type NizelLinkNode = {
  type: 'link';
  href: string;
  title?: string;
  external?: boolean;
  children: NizelInlineNode[];
};
```

Autolinks should create normal link nodes.

## Image

```ts
type NizelImageNode = {
  type: 'image';
  src: string;
  alt?: string;
  title?: string;
};
```

## List

```ts
type NizelListNode = {
  type: 'list';
  ordered: boolean;
  start?: number;
  spread?: boolean;
  children: NizelListItemNode[];
};
```

## List item

```ts
type NizelListItemNode = {
  type: 'listItem';
  checked?: boolean;
  spread?: boolean;
  children: NizelBlockNode[];
};
```

`checked` supports task lists.

## Blockquote

```ts
type NizelBlockquoteNode = {
  type: 'blockquote';
  children: NizelBlockNode[];
};
```

## Thematic break

```ts
type NizelThematicBreakNode = {
  type: 'thematicBreak';
};
```

## Table

```ts
type NizelTableNode = {
  type: 'table';
  align?: Array<'left' | 'center' | 'right' | null>;
  children: NizelTableRowNode[];
};
```

## Table row

```ts
type NizelTableRowNode = {
  type: 'tableRow';
  children: NizelTableCellNode[];
};
```

## Table cell

```ts
type NizelTableCellNode = {
  type: 'tableCell';
  children: NizelInlineNode[];
};
```

## Raw HTML

```ts
type NizelHtmlNode = {
  type: 'html';
  value: string;
};
```

Raw HTML should be disabled by default when `safe` mode is enabled.

## Component

```ts
type NizelComponentNode = {
  type: 'component';
  name: string;
  props?: Record<string, unknown>;
  children?: NizelNode[];
};
```

Component nodes are useful for framework renderers such as Vue, React, or Nuxt.

## Custom block

```ts
type NizelCustomBlockNode = {
  type: 'block';
  name: string;
  props?: Record<string, unknown>;
  children?: NizelNode[];
  value?: string;
};
```

Custom blocks are produced by block definitions.

## Inline nodes

```ts
type NizelInlineNode =
  | NizelTextNode
  | NizelEmphasisNode
  | NizelStrongNode
  | NizelDeleteNode
  | NizelInlineCodeNode
  | NizelLinkNode
  | NizelImageNode
  | NizelHtmlNode
  | NizelComponentNode;
```

## Block nodes

```ts
type NizelBlockNode =
  | NizelParagraphNode
  | NizelHeadingNode
  | NizelCodeNode
  | NizelListNode
  | NizelBlockquoteNode
  | NizelThematicBreakNode
  | NizelTableNode
  | NizelHtmlNode
  | NizelComponentNode
  | NizelCustomBlockNode;
```

## Normalization rules

Nizel should normalize parser output into this AST.

Rules:

- headings include extracted plain text
- heading IDs are generated when anchors are enabled
- autolinks become normal `link` nodes
- code fence language becomes `lang`
- code fence metadata becomes `meta`
- filenames and highlighted lines are parsed when possible
- frontmatter is not part of the AST; it belongs in `meta`
- raw HTML is represented as `html` nodes but can be stripped or escaped in safe mode

## Plugin rules

Plugins should modify AST nodes, not rendered strings, unless they are renderer-specific plugins.

Plugins may:

- add nodes
- replace nodes
- decorate nodes
- add props
- provide renderers for custom nodes

Plugins should not mutate shared global state.

## Renderer rules

Renderers consume the normalized AST.

Renderers should not parse Markdown, frontmatter, or template syntax.

Renderers may output:

- HTML
- text
- AST
- framework component trees
- email-safe HTML

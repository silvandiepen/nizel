---
title: Transforms
icon: ui/arrows-spin
order: 14
---

# Transforms

Transforms receive the normalized AST after parsing and before rendering. They let you modify the content tree programmatically.

## Using Transforms

Transforms can be provided via plugins using the `afterParse` hook, or as a top-level `transforms` array:

```ts
// Using a plugin with the afterParse hook
const plugin = {
  name: 'capitalize-headings',
  hooks: {
    afterParse(ast, options) {
      // walk the tree, modify heading nodes
      return ast;
    },
  },
};

const nizel = useNizel({ plugins: [plugin] });
```

```ts
// Using the top-level transforms option
const nizel = useNizel({
  transforms: [
    (ast) => {
      // modify ast
      return ast;
    },
  ],
});
```

## AST Structure

The AST uses a normalized node format:

```ts
interface NizelNode {
  type: string;        // 'root', 'heading', 'paragraph', 'text', etc.
  children?: NizelNode[];
  value?: string;      // for text and html nodes
  depth?: number;      // for headings (1-6)
  lang?: string;       // for fenced code blocks
  meta?: string;       // for fenced code block info string
  href?: string;       // for links
  src?: string;        // for images
  title?: string;      // for links and images
  alt?: string;        // for images
  ordered?: boolean;   // for lists
  start?: number;      // for ordered lists
  checked?: boolean;   // for task list items
}
```

## Common Transform Patterns

### Modify All Headings

```ts
// Use the elements option to customize heading rendering
const nizel = useNizel({
  elements: {
    heading(node, attrs, children) {
      const tag = `h${node.depth}`;
      return `<${tag} class="heading-${node.depth}">${children}</${tag}>`;
    },
  },
});
```

Or use a transform to modify node properties:

```ts
const nizel = useNizel({
  transforms: [
    (ast) => {
      for (const node of ast.children) {
        if (node.type === 'heading') {
          // modify node properties that the renderer uses
        }
      }
      return ast;
    },
  ],
});
```

### Remove Nodes

```ts
const nizel = useNizel({
  transforms: [
    (ast) => {
      // remove all images
      function walk(node) {
        if (node.children) {
          node.children = node.children.filter(
            (child) => child.type !== 'image'
          );
          node.children.forEach(walk);
        }
      }
      walk(ast);
      return ast;
    },
  ],
});
```

### Rewrite URLs

```ts
const nizel = useNizel({
  transforms: [
    (ast) => {
      function walk(node) {
        if (node.type === 'link' && node.href?.startsWith('http')) {
          node.href = `/proxy?url=${encodeURIComponent(node.href)}`;
        }
        if (node.children) {
          node.children.forEach(walk);
        }
      }
      walk(ast);
      return ast;
    },
  ],
});
```

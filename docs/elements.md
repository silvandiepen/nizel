# Elements

Elements control how HTML is generated.

## Classes

```ts
elements: {
  h1: { class: 'heading-xl' },
  p: { class: 'text' }
}
```

## Attributes

```ts
a: {
  attrs: {
    target: '_blank',
    rel: 'noopener noreferrer'
  }
}
```

## Dynamic rules

```ts
a(node) {
  const external = node.href?.startsWith('http');

  return {
    class: external ? 'link-external' : 'link'
  };
}
```

## Replace elements

```ts
h1: {
  replace(node, ctx) {
    return `<MyHeading>${ctx.render(node.children)}</MyHeading>`;
  }
}
```

## Structured replace

```ts
h1: {
  replace(node) {
    return {
      type: 'component',
      name: 'Heading',
      props: { level: 1 },
      children: node.children
    };
  }
}
```

## Purpose

Elements provide a safe and predictable way to integrate Markdown output into a design system.

They avoid:

- string post-processing
- fragile regex hacks
- renderer overrides

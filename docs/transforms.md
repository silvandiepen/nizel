# Transforms

Transforms receive the normalized AST after parsing.

```ts
const nizel = useNizel({
  transforms: [
    (ast) => {
      ast.children.push({
        type: 'paragraph',
        children: [{ type: 'text', value: 'Appended' }],
      });
    },
  ],
});
```

Transforms can mutate the AST or return a replacement AST.

Transform order:

```txt
parse
plugin afterParse hooks
transforms
collect
render
```


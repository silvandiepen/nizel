# Pipeline

Nizel processes content in a predictable order.

```txt
resolve options
extract frontmatter
render frontmatter templates
render body templates
run beforeParse hooks
parse Markdown to AST
run afterParse hooks
run transforms
collect result metadata
render HTML
select result output
```

Options are merged in this order:

```txt
defaults
plugins
useNizel options
runtime options
```

The parser is an implementation detail. The public contract is the normalized Nizel result object and AST.


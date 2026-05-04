# Result Object

Nizel returns a structured result object.

```ts
const result = await nizel(markdown);
```

## Shape

```ts
type NizelResult<TOutput = string, TMeta = Record<string, unknown>> = {
  result: TOutput;

  html: string;
  text: string;
  ast: NizelNode[];

  meta: TMeta;
  frontmatter: TMeta;

  title?: string;
  description?: string;
  excerpt?: string;

  toc: NizelTocItem[];
  headings: NizelHeading[];
  links: NizelLink[];
  images: NizelImage[];

  readingTime: {
    words: number;
    minutes: number;
  };
};
```

## `result`

The main output based on `options.output`.

```ts
const nizel = useNizel({ output: 'text' });

const { result, text, html } = await nizel(md);

result === text;
```

## `meta` / `frontmatter`

Parsed frontmatter.

```ts
meta.title;
```

## `toc`

Generated from headings.

```ts
[
  { id: 'hello', text: 'Hello', depth: 1 }
]
```

## `headings`

All headings with depth and slug.

## `links` / `images`

Extracted resources from the document.

## `readingTime`

Estimated reading time.

## `ast`

Structured representation of the document.

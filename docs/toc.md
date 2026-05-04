# Table Of Contents

Nizel collects headings into `result.toc`.

```ts
const result = await nizel(`# Intro

## Install`);

console.log(result.toc);
```

Output:

```ts
[
  { id: 'intro', text: 'Intro', depth: 1 },
  { id: 'install', text: 'Install', depth: 2 }
]
```

Disable TOC output:

```ts
const nizel = useNizel({ toc: false });
```

Disable heading anchors:

```ts
const nizel = useNizel({ anchors: false });
```


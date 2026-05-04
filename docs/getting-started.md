# Getting Started

## Install

```bash
npm install nizel
```

## Basic usage

```ts
import { useNizel } from 'nizel';

const nizel = useNizel();

const { html } = await nizel('# Hello');
```

## With options

```ts
const nizel = useNizel({
  output: 'html',
  frontmatter: true,
  toc: true,
  anchors: true
});
```

## With variables

```ts
await nizel('# {{ title }}', {
  data: { title: 'Hello Nizel' }
});
```}}
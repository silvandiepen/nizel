---
title: API Reference
icon: ui/file-code
order: 2
---

# API Reference

## `useNizel(options?)`

Creates a Nizel processor instance.

```ts
import { useNizel } from 'nizel';

const nizel = useNizel(options);
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `output` | `'html' \| 'ast' \| 'text'` | `'html'` | Main output format |
| `frontmatter` | `boolean` | `true` | Extract YAML frontmatter |
| `toc` | `boolean` | `true` | Generate table of contents |
| `anchors` | `boolean` | `true` | Add id attributes to headings |
| `slugStyle` | `'github' \| 'classic'` | `'github'` | Slug generation style |
| `elements` | `object` | `{}` | Customize HTML element output |
| `plugins` | `array` | `[]` | Plugin instances |
| `preset` | `string` | `undefined` | Built-in preset name |
| `safe` | `boolean` | `true` | Sanitize output |
| `variables` | `object` | `{}` | Template variables |
| `autolinks` | `boolean \| object` | `{ enabled: true }` | Auto-link URLs |

### Usage

```ts
const nizel = useNizel({
  output: 'html',
  frontmatter: true,
  toc: true,
  anchors: true,
});
```

## `nizel(markdown, runtimeOptions?)`

Parse Markdown and return a structured result.

```ts
const data = await nizel(markdown, runtimeOptions);
```

### Parameters

- **markdown** `string` — The Markdown source text.
- **runtimeOptions** `object` — Optional per-call overrides.

### Runtime Options

| Option | Type | Description |
|---|---|---|
| `variables` | `object` | Template variables for this call |

### Return Value

Returns a `NizelResult` object. See [Result Object](/guides/result/index.html).

## `useNizel().parse(markdown)`

Returns the raw AST without rendering. This is an async method.

```ts
const ast = await nizel.parse('# Hello');
```

## `useNizel().render(ast)`

Renders an AST to HTML.

```ts
const html = nizel.render(ast);
```

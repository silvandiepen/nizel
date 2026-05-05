# Markdown Benchmarks

This fixture resembles a package README. It mixes prose, headings, lists, links, tables, and code.

## Installation

```bash
npm install nizel markdown-it unified remark-parse remark-gfm remark-html
```

## Usage

```js
import { useNizel } from 'nizel';

const nizel = useNizel();
const html = await nizel.html('# Hello');
console.log(html);
```

## Goals

The benchmark should make it easy to compare engines without hiding the setup choices:

1. Rendering throughput.
2. Parser-only throughput.
3. Fixture size sensitivity.
4. Package version reporting.
5. Repeatable local runs.

## Feature Matrix

| Feature | markdown-it | remark | nizel |
| --- | --- | --- | --- |
| CommonMark | yes | yes | yes |
| GFM | plugin | plugin | core/plugin |
| HTML output | yes | plugin | yes |
| AST access | tokens | mdast | Nizel AST |

## Notes

Performance numbers are only useful when the fixture and configuration are visible. This project stores both alongside the result files.


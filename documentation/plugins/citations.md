---
title: Citations
---

# Citations

`nizel-plugin-citations` adds simple citation references and bibliography output.

```md
See [@doe].

[@doe]: Doe, Example.
```

## Usage

```ts
import { useNizel } from 'nizel';
import { citationsPlugin } from 'nizel-plugin-citations';

const nizel = useNizel({ plugins: [citationsPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'citations'` | CSS class for the generated bibliography section. |

Citation definitions are removed from the document body. Known references render as links to the appended bibliography; unknown references remain as text.

Browser IIFE: `NizelCitations` from `dist/citations.iife.js`.

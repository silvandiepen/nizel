# Safety

Safe output is enabled by default.

```ts
const nizel = useNizel({ safe: true });
```

Nizel escapes:

- text
- HTML attributes
- code block content
- inline code
- raw HTML in safe mode
- element-provided attributes

Raw HTML is treated as text in safe mode.

```md
<script>alert(1)</script>
```

renders as escaped text.

When `safe: false`, raw HTML-like lines are represented as `html` AST nodes and rendered as raw HTML.

Prefer these extension points instead of raw HTML:

- `elements`
- `blocks`
- `transforms`
- `plugins`

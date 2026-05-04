# Frontmatter

Nizel extracts a leading frontmatter block before template rendering and Markdown parsing.

```md
---
title: Hello
description: A page
draft: false
count: 3
---

# {{ meta.title }}
```

Frontmatter values are exposed through:

- `result.meta`
- `result.frontmatter`
- `{{ meta.* }}`
- `{{ frontmatter.* }}`

Supported values are flat scalar values:

- strings
- numbers
- booleans
- `null`

Disable frontmatter:

```ts
const nizel = useNizel({ frontmatter: false });
```


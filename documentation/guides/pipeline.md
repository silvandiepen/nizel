---
title: Pipeline
icon: ui/flow
order: 4
---

# Pipeline

Nizel processes content in a predictable order.

## Steps

```txt
resolve options
extract frontmatter
render frontmatter templates
render body templates
run beforeParse hooks
parse Markdown to AST
run afterParse hooks
run AST transforms
collect metadata
render AST to output format
run afterRender hooks
build result object
```

## Detail

### 1. Resolve Options

Merge constructor options with runtime options. Runtime options win on conflict.

### 2. Extract Frontmatter

If `frontmatter: true`, Nizel looks for a leading `---` block and parses it as YAML. The frontmatter is removed from the Markdown body before parsing continues.

### 3. Render Frontmatter Templates

Template expressions like `{{ value }}` inside frontmatter values are resolved using the provided variables.

### 4. Render Body Templates

Template expressions inside the Markdown body are resolved.

### 5. Before Parse Hooks

Plugins with `beforeParse` hooks run. These can modify the raw Markdown string.

### 6. Parse Markdown

The Markdown body is parsed into an AST. This is the core parsing step that handles block structure, inline content, and nested elements.

### 7. After Parse Hooks

Plugins with `afterParse` hooks run. These receive the AST and can modify it before transforms.

### 8. AST Transforms

Registered transforms receive the AST and can modify it before rendering.

### 9. Collect Metadata

Headings, links, images, reading time, excerpt, and table of contents are collected from the AST.

### 10. Render

The AST is rendered to the output format (HTML by default).

### 11. After Render Hooks

Plugins with `afterRender` hooks run. These can modify the rendered output.

### 12. Build Result

All collected data is assembled into the final result object.

---
title: Definition Lists
description: Definition-list Markdown syntax for Nizel.
icon: ui/list
order: 4
---

# Definition Lists

`nizel-plugin-deflist` converts definition-list syntax into `<dl>`, `<dt>`, and `<dd>` output.

## Install

```bash
npm install nizel-plugin-deflist
```

## Usage

```ts
import { useNizel } from 'nizel';
import { deflistPlugin } from 'nizel-plugin-deflist';

const nizel = useNizel({
  plugins: [deflistPlugin()],
});

const html = await nizel.html(`Term
: Definition`);
```

## Preview

Term
: Definition

Other term
: First definition
: Second definition

## Syntax

```md
Term
: Definition

Other term
: First definition
: Second definition
```

A definition term is a non-empty line followed by one or more lines that start with `: `.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | - | Optional CSS class on the generated `<dl>`. |

## Output

```html
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

The plugin transforms matching source groups before parse, then renders the generated internal custom block as escaped HTML.

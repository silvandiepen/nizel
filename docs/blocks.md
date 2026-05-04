# Blocks

Blocks define structured content.

## Syntax

```md
::alert warning
This is a warning
::
```

## Definition

```ts
defineBlock({
  name: 'alert',

  parse({ args, content }) {
    return {
      kind: args[0],
      content
    };
  },

  formats: {
    html(node, ctx) {
      return `<div class="alert alert--${node.kind}">
        ${ctx.render(node.content)}
      </div>`;
    }
  }
});
```

## Props

```md
::card
title: Hello
image: /img.jpg
::

Content

::
```

## Purpose

Blocks allow structured, reusable content instead of abusing raw HTML.

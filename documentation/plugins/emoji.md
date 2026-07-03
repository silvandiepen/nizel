---
title: Emoji
description: Emoji shortcut replacement outside code.
icon: ui/smile
order: 5
---

# Emoji

`nizel-plugin-emoji` replaces known `:name:` shortcuts with emoji before Markdown is parsed.

Fenced code blocks and inline code spans are preserved.

## Install

```bash
npm install nizel-plugin-emoji
```

## Usage

```ts
import { useNizel } from 'nizel';
import { emojiPlugin } from 'nizel-plugin-emoji';

const nizel = useNizel({
  plugins: [emojiPlugin()],
});

const text = await nizel.text('Ship it :rocket:');
```

## Preview

Ship it :rocket: with :check: status.

## Built-In Shortcuts

Common shortcuts include:

- `:smile:`
- `:heart:`
- `:thumbsup:`
- `:fire:`
- `:rocket:`
- `:check:`
- `:warning:`
- `:tada:`

Unknown shortcuts are left unchanged.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `emojiMap` | `Record<string, string>` | Built-in map | Custom shortcuts merged over the built-in map. |

## Custom Shortcuts

```ts
const nizel = useNizel({
  plugins: [
    emojiPlugin({
      emojiMap: {
        ship: '🚢',
      },
    }),
  ],
});
```

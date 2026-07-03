---
title: Keyboard Shortcuts
description: Semantic keyboard shortcut markup for Nizel.
icon: ui/keyboard
---

# Keyboard Shortcuts

`nizel-plugin-kbd` renders inline keyboard shortcuts as real `<kbd>` elements.

## Install

```bash
npm install nizel-plugin-kbd
```

## Usage

```ts
import { useNizel } from 'nizel';
import { kbdPlugin } from 'nizel-plugin-kbd';
import 'nizel-plugin-kbd/style.css';

const nizel = useNizel({
  plugins: [kbdPlugin({ platform: 'macos' })],
});
```

## Preview

Press <span class="nizel-kbd-group" data-shortcut="Cmd+K"><kbd class="nizel-kbd">Cmd</kbd><span class="nizel-kbd-separator" aria-hidden="true">+</span><kbd class="nizel-kbd">K</kbd></span> to search.

## Syntax

```md
:kbd(Cmd+K)
:kbd(Cmd+Shift+P)
:kbd(Mod+K)
:kbd(Ctrl+Alt+Delete)
:kbd(ArrowUp)
:kbd(Escape)
```

`Mod` resolves to `Cmd` on macOS and `Ctrl` on Windows, Linux, and `auto`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `platform` | `'macos' \| 'windows' \| 'linux' \| 'auto'` | `'auto'` | Platform used for `Mod`. |
| `className` | `string` | `'nizel-kbd'` | Class for each `<kbd>`. |
| `separatorClassName` | `string` | `'nizel-kbd-separator'` | Class for the visible `+` separator. |
| `groupClassName` | `string` | `'nizel-kbd-group'` | Class for the shortcut wrapper. |
| `collectMetadata` | `boolean` | `true` | Adds shortcut usage to `result.meta.kbd.shortcuts`. |
| `aliases` | `Record<string, string>` | `{}` | Maps shorthand names to shortcuts. |

## Metadata

```ts
{
  kbd: {
    shortcuts: [
      { original: 'Mod+K', resolved: 'Cmd+K', keys: ['Cmd', 'K'] }
    ]
  }
}
```

The plugin escapes key text and attributes before rendering.

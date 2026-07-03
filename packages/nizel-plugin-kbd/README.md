# nizel-plugin-kbd

Keyboard shortcut rendering for [Nizel](https://npmjs.com/package/nizel).

## Installation

```bash
npm install nizel-plugin-kbd
```

## Basic Usage

```ts
import { useNizel } from 'nizel';
import { kbdPlugin } from 'nizel-plugin-kbd';
import 'nizel-plugin-kbd/style.css';

const nizel = useNizel({
  plugins: [kbdPlugin({ platform: 'macos' })],
});
```

## Syntax

Use `:kbd(...)` inline syntax:

```md
Press :kbd(Cmd+K) to search.
Open commands with :kbd(Mod+Shift+P).
Cancel with :kbd(Escape).
```

The plugin renders real `<kbd>` elements inside a styleable wrapper:

```html
<span class="nizel-kbd-group" data-shortcut="Cmd+K"><kbd class="nizel-kbd">Cmd</kbd><span class="nizel-kbd-separator" aria-hidden="true">+</span><kbd class="nizel-kbd">K</kbd></span>
```

Whitespace around `+` is ignored, so `:kbd(Cmd+K)` and `:kbd(Cmd + K)` are equivalent.

## Options

```ts
type KbdPlatform = 'macos' | 'windows' | 'linux' | 'auto';

type KbdPluginOptions = {
  platform?: KbdPlatform;
  className?: string;
  separatorClassName?: string;
  groupClassName?: string;
  collectMetadata?: boolean;
  aliases?: Record<string, string>;
};
```

Defaults:

```ts
kbdPlugin({
  platform: 'auto',
  className: 'nizel-kbd',
  separatorClassName: 'nizel-kbd-separator',
  groupClassName: 'nizel-kbd-group',
  collectMetadata: true,
  aliases: {},
});
```

`Mod` resolves to `Cmd` on macOS and `Ctrl` on Windows, Linux, and `auto`.

## Aliases

```ts
kbdPlugin({
  platform: 'macos',
  aliases: {
    search: 'Mod+K',
    commandPalette: 'Mod+Shift+P',
  },
});
```

```md
:kbd(search)
:kbd(commandPalette)
```

## Styling

Import the minimal stylesheet when you want default shortcut styling:

```ts
import 'nizel-plugin-kbd/style.css';
```

The stylesheet defines the group layout, key shape, and separator opacity. Host apps can override all classes.

## Metadata

When `collectMetadata` is enabled, rendered shortcuts are exposed on `result.meta.kbd.shortcuts`.

```ts
{
  kbd: {
    shortcuts: [
      {
        original: 'Mod+K',
        resolved: 'Cmd+K',
        keys: ['Cmd', 'K']
      }
    ]
  }
}
```

## Security

All key text and attributes are escaped before rendering. Malicious input such as `:kbd(<script>)` is rendered as safe text inside `<kbd>`.

## Parser Safety

The plugin does not transform inline code, fenced code, raw HTML blocks, or escaped syntax:

```md
`:kbd(Cmd+K)`
\:kbd(Cmd+K)
```

All generated key text and attributes are HTML-escaped.

## Integration Example

```ts
const result = await nizel('Press :kbd(Mod+K).');

console.log(result.html);
console.log(result.meta.kbd);
```

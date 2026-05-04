# nizel-plugin-emoji

Emoji shortcut support for [Nizel](https://npmjs.com/package/nizel).

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

## Built-In Shortcuts

The plugin includes common shortcuts such as:

- `:smile:`
- `:heart:`
- `:thumbsup:`
- `:fire:`
- `:rocket:`
- `:check:`
- `:warning:`
- `:tada:`

Unknown shortcuts are left unchanged. Fenced code blocks and inline code spans are preserved.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `emojiMap` | `Record<string, string>` | built-in map | Custom shortcuts merged over the built-in map. |

## License

MIT

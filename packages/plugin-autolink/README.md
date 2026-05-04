# nizel-plugin-autolink

Autolink behavior plugin for [Nizel](https://npmjs.com/package/nizel).

Configures how bare URLs and email addresses are converted to links.

## Install

```bash
npm install nizel-plugin-autolink
```

## Usage

```js
import { useNizel } from 'nizel';
import { autolinkPlugin } from 'nizel-plugin-autolink';

const processor = useNizel({
  plugins: [
    autolinkPlugin({
      enabled: true,
      target: '_blank',
      rel: 'noopener noreferrer',
    }),
  ],
});

const result = processor.process('Visit https://example.com');
// <p>Visit <a href="https://example.com" target="_blank" rel="noopener noreferrer">https://example.com</a></p>
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Enable or disable autolinking |
| `target` | `string` | — | `target` attribute for generated links |
| `rel` | `string` | — | `rel` attribute for generated links |

## License

MIT

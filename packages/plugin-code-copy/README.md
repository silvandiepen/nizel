# nizel-plugin-code-copy

CSP-friendly code copy markup plugin for [Nizel](https://npmjs.com/package/nizel).

Renders copy buttons on fenced code blocks without requiring inline JavaScript — works under strict Content Security Policy.

The plugin wraps code-like blocks instead of replacing the active code renderer, so it can be combined with syntax highlighting or explicit diagram plugins.

## Install

```bash
npm install nizel-plugin-code-copy
```

## Usage

```js
import { useNizel } from 'nizel';
import { codeCopyPlugin } from 'nizel-plugin-code-copy';

const processor = useNizel({
  plugins: [
    codeCopyPlugin({ label: 'Copy' }),
  ],
});

const result = processor.process('```js\nconsole.log("hello")\n```');
// Produces a <figure> with a <button data-nizel-copy-button> and the code block
```

## Output Structure

```html
<figure class="nizel-code-copy" data-nizel-code-copy>
  <figcaption>filename.js</figcaption>  <!-- if filename provided -->
  <button type="button" class="nizel-code-copy__button" data-nizel-copy-button>Copy</button>
  <pre><code class="language-js">console.log("hello")</code></pre>
</figure>
```

The figure also includes `data-nizel-copy-source` with the original escaped source text. Wire up the copy behavior with your own JS by querying `[data-nizel-copy-button]`.

Because code-copy is a wrapper, this works with another plugin that renders the child code block:

```js
useNizel({
  plugins: [
    shikiPlugin({ highlighter }),
    diagramsPlugin(),
    codeCopyPlugin(),
  ],
});
```

Only explicit Mermaid fences such as ```` ```mermaid ```` become diagrams when the diagrams plugin is enabled.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `'Copy'` | Button text |

## License

MIT

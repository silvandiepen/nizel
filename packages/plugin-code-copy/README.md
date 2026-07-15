# nizel-plugin-code-copy

Code copy plugin for [Nizel](https://npmjs.com/package/nizel).

Renders copy buttons on fenced code blocks. By default, buttons include inline JavaScript that copies the original source text.

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
// Produces a <figure> with a copying <button data-nizel-copy-button> and the code block
```

## Output Structure

```html
<figure class="nizel-code-copy" data-nizel-code-copy>
  <figcaption>filename.js</figcaption>  <!-- if filename provided -->
  <textarea class="nizel-code-copy__source" data-nizel-copy-source hidden readonly tabindex="-1" aria-hidden="true" style="display: none">console.log("hello")</textarea>
  <button type="button" class="nizel-code-copy__button" data-nizel-copy-button onclick="...">
    <span class="nizel-code-copy__label" data-nizel-copy-label>Copy</span>
  </button>
  <pre><code class="language-js">console.log("hello")</code></pre>
</figure>
```

The hidden textarea contains the original escaped source text. The button copies from `[data-nizel-copy-source]`, so syntax highlighting or renderer changes do not affect the copied value.

For strict Content Security Policy or framework-owned behavior, switch to button-only mode:

```js
codeCopyPlugin({ mode: 'button' });
```

Then wire up copy behavior with your own JS by querying `[data-nizel-copy-button]`.

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
| `copiedLabel` | `string` | `'Copied'` | Temporary button text after copying |
| `mode` | `'inline' \| 'button'` | `'inline'` | Inline copy handler or button-only markup |

## License

MIT

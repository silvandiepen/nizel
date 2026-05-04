# nizel-plugin-code-copy

CSP-friendly code copy markup plugin for [Nizel](https://npmjs.com/package/nizel).

Renders copy buttons on fenced code blocks without requiring inline JavaScript — works under strict Content Security Policy.

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

Wire up the copy behavior with your own JS by querying `[data-nizel-copy-button]`.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `'Copy'` | Button text |

## License

MIT

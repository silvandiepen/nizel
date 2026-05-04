---
title: Code Copy
description: CSP-friendly copy controls for fenced code blocks.
icon: ui/copy
order: 3
---

# Code Copy

`nizel-plugin-code-copy` renders copy controls for fenced code blocks without inline JavaScript.

The plugin only emits markup. Your application owns the browser-side copy behavior, so it works well with strict Content Security Policy.

## Install

```bash
npm install nizel-plugin-code-copy
```

## Usage

```ts
import { useNizel } from 'nizel';
import { codeCopyPlugin } from 'nizel-plugin-code-copy';

const nizel = useNizel({
  plugins: [codeCopyPlugin({ label: 'Copy' })],
});

const html = await nizel.html('```js\nconsole.log("hello")\n```');
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `'Copy'` | Button text for generated copy controls. |

## Output

```html
<figure class="nizel-code-copy" data-nizel-code-copy>
  <figcaption>filename.js</figcaption>
  <button type="button" class="nizel-code-copy__button" data-nizel-copy-button>Copy</button>
  <pre><code class="language-js">console.log("hello")</code></pre>
</figure>
```

`figcaption` is only rendered when the parsed code block includes a filename.

## Browser Behavior

Attach your own JavaScript to `[data-nizel-copy-button]`.

```ts
document.querySelectorAll('[data-nizel-copy-button]').forEach((button) => {
  button.addEventListener('click', async () => {
    const figure = button.closest('[data-nizel-code-copy]');
    const code = figure?.querySelector('code')?.textContent ?? '';
    await navigator.clipboard.writeText(code);
  });
});
```

---
title: Code Copy
description: Copy controls for fenced code blocks.
icon: ui/copy
order: 3
---

# Code Copy

`nizel-plugin-code-copy` renders copy controls for fenced code blocks.

By default, generated buttons include inline JavaScript that copies the original source text. Use button-only mode when your application needs strict Content Security Policy or framework-owned browser behavior.

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
| `copiedLabel` | `string` | `'Copied'` | Temporary button text after copying. |
| `mode` | `'inline' \| 'button'` | `'inline'` | Inline copy handler or button-only markup. |

## Output

```html
<figure class="nizel-code-copy" data-nizel-code-copy>
  <figcaption>filename.js</figcaption>
  <textarea class="nizel-code-copy__source" data-nizel-copy-source hidden readonly tabindex="-1" aria-hidden="true" style="display: none">console.log("hello")</textarea>
  <button type="button" class="nizel-code-copy__button" data-nizel-copy-button onclick="...">Copy</button>
  <pre><code class="language-js">console.log("hello")</code></pre>
</figure>
```

`figcaption` is only rendered when the parsed code block includes a filename. The hidden textarea stores the original source text, so highlighted markup or renderer output does not change what gets copied.

## Button-Only Mode

```ts
const nizel = useNizel({
  plugins: [codeCopyPlugin({ mode: 'button' })],
});
```

Button-only mode omits the inline `onclick` attribute. Attach your own JavaScript to `[data-nizel-copy-button]`.

```ts
document.querySelectorAll('[data-nizel-copy-button]').forEach((button) => {
  button.addEventListener('click', async () => {
    const figure = button.closest('[data-nizel-code-copy]');
    const code = figure?.querySelector('[data-nizel-copy-source]')?.value ?? '';
    await navigator.clipboard.writeText(code);
  });
});
```

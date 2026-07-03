# Code Blocks

Code blocks are a core node type in Nizel.

Syntax highlighting and copy buttons should be implemented through first-party plugins. The code-block data model belongs in core.

## AST shape

```ts
type NizelCodeNode = {
  type: 'code';
  code: string;
  lang?: string;
  meta?: string;
  filename?: string;
  highlightLines?: number[];
};
```

## Markdown input

````md
```ts filename="example.ts" {1,3-5}
const message = 'Hello';
console.log(message);
```
````

Should produce something like:

```ts
{
  type: 'code',
  lang: 'ts',
  filename: 'example.ts',
  highlightLines: [1, 3, 4, 5],
  code: "const message = 'Hello';\nconsole.log(message);"
}
```

## Copy support

Copy buttons are plugin-owned.

Core should not render copy-button HTML automatically and should never inject inline JavaScript.

A plugin can add copy markup, inline handlers, runtime helpers, framework components, or metadata.

```ts
import { codeCopyPlugin } from 'nizel-plugin-code-copy';

const nizel = useNizel({
  plugins: [codeCopyPlugin()]
});
```

The plugin may transform the code node or renderer output, but core remains clean and safe.

## Highlighting mode

Syntax highlighting is plugin-owned.

The Shiki plugin should highlight code blocks by default, while inline code should remain unhighlighted unless explicitly configured.

```ts
import { shikiPlugin } from 'nizel-plugin-shiki';

const nizel = useNizel({
  plugins: [
    shikiPlugin({
      theme: 'github-dark',
      highlighter(code, meta) {
        return highlight(code, meta);
      },
      mode: 'blocks' // 'blocks' | 'inline'
    })
  ]
});
```

## Inline code

Inline code should not be highlighted by default.

```md
Use `const value = true` here.
```

It should render as normal inline code unless a highlighting plugin is configured to handle inline code.

## Worker compatibility

The first-party highlighting plugin should prefer Shiki, but it must be usable in Worker-style runtimes.

The plugin should avoid Node-only APIs and should support async initialization.

Use `nizel-plugin-shiki/javascript` when the bundle must avoid Shiki's Oniguruma WASM engine:

```ts
import { shikiPlugin } from 'nizel-plugin-shiki';
import { createJavaScriptShikiHighlighter } from 'nizel-plugin-shiki/javascript';

const highlighter = await createJavaScriptShikiHighlighter({
  themes: ['github-dark'],
  langs: ['javascript', 'typescript'],
  defaultTheme: 'github-dark',
  defaultLang: 'text',
});

const nizel = useNizel({
  plugins: [shikiPlugin({ highlighter })],
});
```

## Fallback

If Shiki is not loaded, code blocks must still render safely.

```html
<pre><code class="language-ts">const value = true;</code></pre>
```

## Responsibility split

Core owns:

- code AST node shape
- language metadata
- filename metadata
- line-highlight metadata
- safe fallback rendering

Plugin owns:

- syntax highlighting
- theme loading
- language loading
- highlighted HTML/token output
- copy button markup
- copy runtime behavior
- framework-specific copy components

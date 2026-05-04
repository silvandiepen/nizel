# Code Blocks

Code blocks are a core node type in Nizel.

Syntax highlighting is implemented through a first-party plugin, but the code-block data model belongs in core.

## AST shape

```ts
type NizelCodeNode = {
  type: 'code';
  code: string;
  lang?: string;
  meta?: string;
  filename?: string;
  highlightLines?: number[];
  copy?: boolean;
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
  copy: true,
  code: "const message = 'Hello';\nconsole.log(message);"
}
```

## Copy support

Copy support is a core concern because it affects the result shape and rendering options.

The actual UI can still be implemented by a renderer or plugin, but the option should exist in core.

```ts
const nizel = useNizel({
  code: {
    copy: true
  }
});
```

## Highlighting mode

Highlighting should be block-only by default.

```ts
const nizel = useNizel({
  code: {
    highlight: 'blocks' // false | 'blocks' | 'inline' | 'all'
  }
});
```

Default:

```ts
code: {
  highlight: 'blocks',
  copy: true
}
```

## Inline code

Inline code should not be highlighted by default.

```md
Use `const value = true` here.
```

It should render as normal inline code unless explicitly configured:

```ts
code: {
  highlight: 'all'
}
```

## Worker compatibility

The first-party highlighting plugin should prefer Shiki, but it must be usable in Worker-style runtimes.

The plugin should avoid Node-only APIs and should support async initialization.

```ts
import { shikiPlugin } from 'nizel-plugin-shiki';

const nizel = useNizel({
  plugins: [
    shikiPlugin({
      theme: 'github-dark',
      langs: ['ts', 'js', 'html', 'css', 'md']
    })
  ]
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
- code options
- copy metadata
- language metadata
- safe fallback rendering

Plugin owns:

- syntax highlighting
- theme loading
- language loading
- highlighted HTML/token output

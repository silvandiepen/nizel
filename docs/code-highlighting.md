# Code Highlighting

Syntax highlighting should be implemented as a plugin.

## Why a plugin

- Highlighting libraries are large (e.g. Shiki)
- Not all users need it
- Allows multiple implementations
- Keeps core lightweight

## Default behavior (core)

Without a plugin, code blocks should render safely:

```html
<pre><code>const x = 1;</code></pre>
```

No highlighting, no extra markup.

## Plugin example

```ts
import { codeHighlightPlugin } from 'nizel-plugin-code-highlight';

const nizel = useNizel({
  plugins: [codeHighlightPlugin()]
});
```

## Plugin responsibilities

The plugin should:

- detect language from code fences
- highlight code
- return HTML or structured output

## Example implementation

```ts
defineNizelPlugin({
  name: 'code-highlight',

  blocks: {
    code: {
      formats: {
        html(node) {
          return highlight(node.code, node.lang);
        }
      }
    }
  }
});
```

## Optional features

Plugins may add:

- line highlighting
- copy button metadata
- filename support
- language labels

## Integration with result

Highlighted code should still be part of the AST.

Nizel should not lose structural information.

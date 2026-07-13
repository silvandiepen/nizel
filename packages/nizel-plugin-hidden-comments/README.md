# nizel-plugin-hidden-comments

Render Markdown HTML comments as first-class Nizel content.

```ts
import { hiddenCommentsPlugin } from 'nizel-plugin-hidden-comments';

const html = await useNizel({
  plugins: [hiddenCommentsPlugin({ mode: 'hide' })],
}).html('Visible <!-- internal note --> text');
```

## Modes

- `hide` renders a copyable, PDF text-layer friendly hidden span.
- `small` renders the comment as small muted text.
- `render` renders the comment at the normal inline size.
- `remove` removes comments from the rendered document.

The plugin does not inject CSS by default. Use `nizel-style` for standard styling, or pass `injectCss: true` when a standalone render needs inline rules.

# Inline Markdown

Nizel supports these inline features:

- emphasis: `*text*` and `_text_`
- strong: `**text**` and `__text__`
- delete: `~~text~~`
- inline code: `` `code` ``
- links: `[label](https://example.com)`
- images: `![alt](/image.png)`
- autolink URLs
- autolink emails

Autolinks are enabled by default:

```md
Visit https://example.com
Contact me@example.com
```

Disable autolinks:

```ts
const nizel = useNizel({ autolinks: false });
```

Autolinks are not applied inside existing links, inline code, or code blocks.

Standalone images are rendered inside a paragraph by default because images are inline Markdown content:

```html
<p><img src="/image.png" alt="Alt" /></p>
```

Set `unwrapStandaloneImages: true` to render image-only paragraphs as bare image elements:

```ts
const nizel = useNizel({ unwrapStandaloneImages: true });
```

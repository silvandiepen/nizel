# Automatic Links

Nizel should automatically convert URLs into links.

## Default behavior

This feature should be enabled by default.

```md
Visit https://example.com
```

Output:

```html
<p>Visit <a href="https://example.com">https://example.com</a></p>
```

## Rules

- Only valid URLs should be converted
- Do not affect code blocks
- Do not affect inline code
- Do not affect already existing links

## Email support

```md
Contact me@example.com
```

Should become:

```html
<a href="mailto:me@example.com">me@example.com</a>
```

## Customization

```ts
const nizel = useNizel({
  autolinks: {
    enabled: true,
    target: '_blank',
    rel: 'noopener noreferrer'
  }
});
```

## Plugin override

Autolink behavior can be replaced by a plugin if needed.

## Purpose

This removes the need for authors to manually write Markdown links for every URL.

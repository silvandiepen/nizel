# Filters

Filters transform template values before Markdown parsing.

```md
# {{ title | title }}
{{ slug | kebab }}
{{ amount | format('currency', 'EUR') }}
```

## Built-In Filters

Nizel includes these filters by default:

- `lower`
- `upper`
- `title`
- `kebab`
- `camel`
- `pascal`
- `snake`
- `constant`
- `format`

Casing filters use `@sil/case`.

## Custom Filters

```ts
const nizel = useNizel({
  template: {
    filters: {
      shout(value) {
        return String(value).toUpperCase();
      },
    },
  },
});
```

Filters can also be provided by plugins.


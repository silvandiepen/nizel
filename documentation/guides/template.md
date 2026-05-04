---
title: Template Variables
icon: ui/curly-braces
order: 5
---

# Template Variables

Nizel supports variable injection before Markdown parsing. Use `{{ expression }}` syntax in both frontmatter and body content.

## Basic Usage

```ts
const { html } = await nizel(
  '# Hello {{ name }}',
  { variables: { name: 'World' } },
);
// <h1>Hello World</h1>
```

## In Frontmatter

```ts
const { meta } = await nizel(`
---
title: {{ product.name | title }}
slug: {{ product.name | kebab }}
---
Content here.
`, { variables: { product: { name: 'nizel handbook' } } });
// meta.title === 'Nizel Handbook'
// meta.slug === 'nizel-handbook'
```

## In Body

```ts
const { html } = await nizel(
  `Price: {{ price | format('currency', 'EUR') }}`,
  { variables: { price: 29.99 } },
);
```

## Nested Access

Dot notation works for nested objects:

```md
{{ user.name }}
{{ config.theme.primary }}
{{ items.length }}
```

## Filters

Variables can be piped through filters:

```md
{{ name | capitalize }}
{{ name | kebab }}
{{ price | format('currency', 'USD') }}
{{ date | format('date', 'dd MMM yyyy') }}
```

See [Filters](/guides/filters/index.html) for the full list.

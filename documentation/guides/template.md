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

## From Frontmatter

Values declared in frontmatter are available as body template variables:

```md
---
entityName: Henk
documentName: "{{ entityName }} service agreement"
---

# {{ documentName | title }}

This agreement is between {{ entityName }} and the customer.
```

Use `{{ frontmatter.entityName }}` or `{{ meta.entityName }}` when you want to be explicit about where the value came from. Runtime `variables` and `data` override same-name frontmatter values.

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

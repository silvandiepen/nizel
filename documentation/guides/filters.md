---
title: Filters
icon: ui/funnel
order: 6
---

# Filters

Filters transform template values before Markdown parsing. Nizel includes built-in filters from `@sil/format` and `@sil/case`.

## Case Filters

From `@sil/case`:

| Filter | Input | Output |
|---|---|---|
| `camel` | `hello world` | `helloWorld` |
| `capital` | `hello world` | `Hello world` |
| `constant` | `hello world` | `HELLO_WORLD` |
| `dot` | `hello world` | `hello.world` |
| `header` | `hello world` | `Hello-World` |
| `kebab` | `hello world` | `hello-world` |
| `lower` | `Hello World` | `hello world` |
| `pascal` | `hello world` | `HelloWorld` |
| `path` | `hello world` | `hello/world` |
| `sentence` | `hello world` | `Hello world` |
| `snake` | `hello world` | `hello_world` |
| `title` | `hello world` | `Hello World` |
| `upper` | `hello world` | `HELLO WORLD` |

## Format Filters

From `@sil/format`:

| Filter | Usage | Description |
|---|---|---|
| `format` | `format('currency', 'EUR')` | Format a number as currency |
| `format` | `format('date', 'dd MMM yyyy')` | Format a date string |
| `format` | `format('number', '0.00')` | Format a number with pattern |

## Usage

```md
---
title: "{{ product.name | title }}"
slug: "{{ product.name | kebab }}"
---

# {{ meta.title }}

Price: {{ price | format('currency', 'EUR') }}
Date: {{ publishedAt | format('date', 'dd MMM yyyy') }}
Status: {{ status | upper }}
```

## Chaining

Filters can be chained:

```md
{{ name | trim | kebab }}
```

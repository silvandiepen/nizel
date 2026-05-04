# Template & Variables

Nizel supports variable injection before Markdown parsing.

## Syntax

```md
# {{ title }}

Hello {{ user.name }}
```

## Usage

```ts
await nizel(md, {
  data: {
    title: 'Hello',
    user: { name: 'Sil' }
  }
});
```

## Filters (built-in)

Nizel includes filters from:

- @sil/case
- @sil/format

### Examples

```md
{{ title | title }}
{{ title | kebab }}
{{ amount | format('currency', 'EUR') }}
```

## Raw output

```md
{{{ html }}}
```

Disabled by default.

## Missing values

```ts
template: {
  missing: 'keep' // keep | empty | error
}
```}}
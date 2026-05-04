# nizel-plugin-alert

GitHub-style alert blocks for [Nizel](https://npmjs.com/package/nizel).

## Install

```bash
npm install nizel-plugin-alert
```

## Usage

```ts
import { useNizel } from 'nizel';
import { alertPlugin } from 'nizel-plugin-alert';

const nizel = useNizel({
  plugins: [alertPlugin()],
});

const html = await nizel.html(`::warning Careful
Pay **attention**.
::`);
```

## Syntax

The plugin registers these custom block names:

- `note`
- `tip`
- `important`
- `warning`
- `caution`

The first argument or `title` prop is rendered as the alert title.

```md
::tip Helpful
Use Markdown inside the alert body.
::
```

```md
::tip
title: Helpful
::
Use Markdown inside the alert body.
::
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'alert'` | Root CSS class used for generated alert markup. |

## Output

```html
<div class="alert alert--warning" data-alert="warning">
  <p class="alert__title">Careful</p>
  <div class="alert__content">...</div>
</div>
```

## License

MIT

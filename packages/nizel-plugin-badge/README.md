# nizel-plugin-badge

Inline badge and status label syntax for Nizel.

## Installation

```bash
npm install nizel-plugin-badge
```

## Basic Usage

```ts
import { useNizel } from 'nizel';
import { badgePlugin } from 'nizel-plugin-badge';
import 'nizel-plugin-badge/style.css';

const nizel = useNizel({
  plugins: [
    badgePlugin({
      defaultTone: 'neutral',
    }),
  ],
});
```

## Syntax

```md
:badge(beta)
:badge(v1.2.0)
:badge(deprecated, tone="warning")
:badge(done, tone="success", title="This task is complete")
:badge("Breaking Change", tone="danger")
```

The first positional argument is the label. Use quotes when the label contains a comma or closing parenthesis.

## Options

```ts
badgePlugin({
  className: 'nizel-badge',
  defaultTone: 'neutral',
  allowedTones: ['neutral', 'info', 'success', 'warning', 'danger', 'purple', 'blue', 'green', 'yellow', 'red'],
  collectMetadata: true,
  aliases: {
    beta: { label: 'Beta', tone: 'info' },
    deprecated: { label: 'Deprecated', tone: 'warning' },
    done: { label: 'Done', tone: 'success' },
  },
});
```

Supported Markdown options are `tone`, `title`, and `className`.

Unknown or disallowed tones fall back to the configured `defaultTone`, or `neutral` if the configured default is not allowed.

## Output

```md
:badge(deprecated, tone="warning")
```

```html
<span class="nizel-badge" data-tone="warning">deprecated</span>
```

All label, title, class, and tone values are escaped before rendering.

## Aliases

```ts
badgePlugin({
  aliases: {
    beta: { label: 'Beta', tone: 'info' },
    deprecated: { label: 'Deprecated', tone: 'warning' },
    done: { label: 'Done', tone: 'success' },
  },
});
```

Explicit Markdown options override alias defaults.

## Styling

Import the default stylesheet when you want the minimal bundled badge styles:

```ts
import 'nizel-plugin-badge/style.css';
```

The stylesheet only defines the base pill shape and tone colors. Host apps can override all selectors.

## Metadata

When `collectMetadata` is enabled, the plugin adds badge usage to `result.meta.badge.badges`.

```ts
{
  badge: {
    badges: [
      {
        label: 'Deprecated',
        tone: 'warning',
        original: 'deprecated'
      }
    ]
  }
}
```

## Security

The plugin escapes badge labels, titles, custom classes, and `data-tone` values. Unknown tones do not pass through to HTML; they fall back to `defaultTone` or `neutral`.

## Parser Behavior

The plugin transforms inline `:badge(...)` expressions in normal text. It does not transform fenced code, inline code, raw HTML blocks, or escaped syntax such as `\:badge(beta)`.

## Integration Example

```ts
const result = await nizel('# Release :badge(beta, tone="info")');

console.log(result.html);
console.log(result.meta.badge);
```

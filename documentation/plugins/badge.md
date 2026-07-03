---
title: Badge
description: Inline badges and status labels for Nizel.
icon: ui/tag
---

# Badge

`nizel-plugin-badge` renders compact inline labels with safe tones, aliases, titles, and metadata.

## Install

```bash
npm install nizel-plugin-badge
```

## Usage

```ts
import { useNizel } from 'nizel';
import { badgePlugin } from 'nizel-plugin-badge';
import 'nizel-plugin-badge/style.css';

const nizel = useNizel({
  plugins: [badgePlugin()],
});
```

## Preview

<span class="nizel-badge" data-tone="info">Beta</span>
<span class="nizel-badge" data-tone="success">Done</span>
<span class="nizel-badge" data-tone="warning" title="Deprecated API">Deprecated</span>

## Syntax

```md
:badge(beta)
:badge(v1.2.0)
:badge(deprecated, tone="warning")
:badge(done, tone="success", title="This task is complete")
:badge("Breaking Change", tone="danger")
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `className` | `string` | `'nizel-badge'` | Base class for rendered badges. |
| `defaultTone` | `BadgeTone` | `'neutral'` | Tone used when no valid tone is supplied. |
| `allowedTones` | `BadgeTone[]` | built-in tones | Allowed tone whitelist. |
| `collectMetadata` | `boolean` | `true` | Adds badge usage to `result.meta.badge.badges`. |
| `aliases` | `Record<string, BadgeAlias>` | `{}` | Maps shorthand labels to label/tone defaults. |

Unknown tones fall back to the configured default, then `neutral`.

## Metadata

```ts
{
  badge: {
    badges: [
      { label: 'Deprecated', tone: 'warning', original: 'deprecated' }
    ]
  }
}
```

The plugin escapes labels, titles, classes, and attributes before rendering.

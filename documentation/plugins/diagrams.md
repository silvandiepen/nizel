---
title: Diagrams
---

# Diagrams

`nizel-plugin-diagrams` renders Mermaid fences as containers for a host Mermaid renderer.

````md
```mermaid
flowchart TD
  A --> B
```
````

## Usage

```ts
import { useNizel } from 'nizel';
import { diagramsPlugin } from 'nizel-plugin-diagrams';

const nizel = useNizel({ plugins: [diagramsPlugin()] });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mermaid` | `boolean` | `true` | Render Mermaid fences as diagram containers. |
| `className` | `string` | `'mermaid'` | CSS class used for Mermaid containers. |

This plugin does not bundle Mermaid. Load and run the diagram renderer in the host app.

Browser IIFE: `NizelDiagrams` from `dist/diagrams.iife.js`.

# nizel-plugin-gfm

GFM-oriented companion preset for [Nizel](https://npmjs.com/package/nizel).

Nizel core already handles Markdown fundamentals such as tables, task-list metadata, strikethrough, and raw/autolink syntax that belongs in the parser. This package provides a small opt-in preset for first-party plugins that commonly accompany GitHub Flavored Markdown workflows.

The browser build exposes `NizelGfm` from `dist/gfm.iife.js`.

## Install

```bash
npm install nizel-plugin-gfm
```

## Usage

```ts
import { useNizel } from 'nizel';
import { gfmPlugin, gfmPlugins } from 'nizel-plugin-gfm';

const nizel = useNizel({
  plugins: [gfmPlugin()],
});

const explicit = useNizel({
  plugins: gfmPlugins({ alerts: true, autolinks: true, taskLists: { mode: 'view' } }),
});
```

## Included Plugins

By default the preset enables:

- `nizel-plugin-autolink`
- `nizel-plugin-alert`
- `nizel-plugin-task-list`

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `alerts` | `boolean` | `true` | Include GitHub-style alert/callout support. |
| `autolinks` | `boolean` | `true` | Include configurable bare URL and email autolinks. |
| `taskLists` | `boolean \| TaskListPluginOptions` | `true` | Include task-list checkbox rendering. |

## License

MIT

# nizel-plugin-task-list

Task-list checkbox rendering plugin for [Nizel](https://npmjs.com/package/nizel).

Core Nizel parses Markdown task markers into list item metadata. This plugin turns that metadata into checkbox markup.

## Install

```bash
npm install nizel-plugin-task-list
```

## Usage

```ts
import { useNizel } from 'nizel';
import { taskListPlugin } from 'nizel-plugin-task-list';

const nizel = useNizel({
  plugins: [taskListPlugin()],
});
```

## Modes

View-only checkboxes are disabled by default:

```ts
taskListPlugin({ mode: 'view' });
```

Editable checkboxes can be toggled in the rendered page:

```ts
taskListPlugin({ mode: 'edit' });
```

The plugin does not persist edits back to Markdown. Applications that need persistence should listen for checkbox changes and update their own document state.

## License

MIT

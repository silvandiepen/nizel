# nizel-plugin-task-list

Task-list checkbox rendering plugin for [Nizel](https://npmjs.com/package/nizel).

Core Nizel parses `- [ ]` and `- [x]` markers into list item metadata (`checked`). This plugin turns that metadata into checkbox markup so applications can choose static or editable behavior without re-parsing the document.

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

const html = await nizel.html(`- [x] Done
- [ ] Todo`);
```

Task markers work on ordered and unordered lists, including nested lists and blockquotes.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'view' \| 'edit'` | `'view'` | `view` renders disabled checkboxes; `edit` renders enabled checkboxes the user can toggle. |

## Modes

### View mode (default)

Checkboxes are rendered with the `disabled` attribute so they stay in sync with the source Markdown and cannot be toggled by the reader.

```ts
taskListPlugin({ mode: 'view' });
```

### Edit mode

Checkboxes render without `disabled`, so readers can toggle them in the rendered page.

```ts
taskListPlugin({ mode: 'edit' });
```

Edit mode only updates the rendered checkbox state in the browser. The plugin does not persist edits back to Markdown. Applications that need persistence should listen for checkbox changes and update their own document state:

```ts
document.querySelectorAll('[data-nizel-task-checkbox]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const item = checkbox.closest('li');
    item?.toggleAttribute('data-checked', checkbox.checked);
    // Sync checkbox.checked back to your Markdown document source here.
  });
});
```

## Output

Each task item's first paragraph is wrapped in a `<label>` containing the checkbox input and a content `<span>`. Non-task items are left untouched.

```html
<ul>
  <li data-checked><label class="nizel-task-list__label"><input class="nizel-task-list__checkbox" data-nizel-task-checkbox type="checkbox" checked disabled><span class="nizel-task-list__content">Done</span></label></li>
  <li><label class="nizel-task-list__label"><input class="nizel-task-list__checkbox" data-nizel-task-checkbox type="checkbox" disabled><span class="nizel-task-list__content">Todo</span></label></li>
</ul>
```

## CSS Classes

| Selector | Element |
| --- | --- |
| `.nizel-task-list__label` | `<label>` wrapping the checkbox and its text. |
| `.nizel-task-list__checkbox` | The `<input type="checkbox">` control. |
| `.nizel-task-list__content` | `<span>` wrapping the task text. |
| `[data-nizel-task-checkbox]` | Attribute hook for the checkbox, stable across class name changes. |

## Styling

Use the standalone style entrypoint when loading plugin CSS selectively:

```ts
import 'nizel-style/plugins/task-list.css';
```

## API

```ts
export type TaskListPluginMode = 'view' | 'edit';

export type TaskListPluginOptions = {
  mode?: TaskListPluginMode;
};

export const taskListPlugin: (options?: TaskListPluginOptions) => NizelPlugin;
export const transformTaskLists: (ast: NizelRootNode, mode?: TaskListPluginMode) => NizelRootNode;

export default taskListPlugin;
```

`transformTaskLists` is exported for applications that apply the same transformation outside the plugin pipeline.

## License

MIT

---
title: Task Lists
description: Render Markdown task-list metadata as view-only or editable checkboxes.
icon: ui/check-square
order: 18
---

# Task Lists

`nizel-plugin-task-list` renders parsed task-list items as checkbox markup.

Core Nizel parses `- [ ]` and `- [x]` markers into list item metadata (`checked`). This plugin owns the rendered checkbox controls, so applications choose static or editable behavior without re-parsing the document.

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

## Syntax

Task-list items use the standard GFM checkbox markers. Markers are parsed by core Nizel; the plugin only adds checkbox markup.

```md
- [x] Done
- [ ] Todo
  - [x] Nested items work too
```

Markers are supported on ordered and unordered lists, and inside nested lists and blockquotes.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'view' \| 'edit'` | `'view'` | `view` renders disabled checkboxes; `edit` renders enabled checkboxes the user can toggle. |

## Modes

### View mode

The default. Checkboxes are rendered with the `disabled` attribute so they stay in sync with the source Markdown and cannot be toggled by the reader.

```ts
taskListPlugin({ mode: 'view' });
```

### Edit mode

Checkboxes render without `disabled`, so readers can toggle them in the rendered page.

```ts
taskListPlugin({ mode: 'edit' });
```

Edit mode only updates the rendered checkbox state in the browser. The plugin does not persist edits back to Markdown. Applications that need persistence should listen for checkbox changes and update their own document state.

```ts
document.querySelectorAll('[data-nizel-task-checkbox]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const item = checkbox.closest('li');
    if (!item) return;
    item.toggleAttribute('data-checked', checkbox.checked);
    // Sync checkbox.checked back to your Markdown document source here.
  });
});
```

## Output

Each task item's first paragraph is wrapped in a `<label>` containing the checkbox input and a content `<span>`.

```html
<ul>
  <li data-checked><label class="nizel-task-list__label"><input class="nizel-task-list__checkbox" data-nizel-task-checkbox type="checkbox" checked disabled><span class="nizel-task-list__content">Done</span></label></li>
  <li><label class="nizel-task-list__label"><input class="nizel-task-list__checkbox" data-nizel-task-checkbox type="checkbox" disabled><span class="nizel-task-list__content">Todo</span></label></li>
</ul>
```

Non-task items are left untouched. Core Nizel keeps the `data-checked` attribute on checked `<li>` elements so plugins and CSS can react to state without inspecting the checkbox.

## CSS Classes

| Selector | Element |
| --- | --- |
| `.nizel-task-list__label` | `<label>` wrapping the checkbox and its text. |
| `.nizel-task-list__checkbox` | The `<input type="checkbox">` control. |
| `.nizel-task-list__content` | `<span>` wrapping the task text. |
| `[data-nizel-task-checkbox]` | Attribute hook for the checkbox input, stable across class name changes. |

## Styling

Use the standalone style entrypoint when loading plugin CSS selectively:

```ts
import 'nizel-style/plugins/task-list.css';
```

The default styles hide the native list marker on task items and lay out the checkbox alongside the content. Customize appearance with the `--nizel-task-*` custom properties:

| Token | Purpose |
| --- | --- |
| `--nizel-task-border` | Checkbox border color (unchecked). |
| `--nizel-task-background` | Checkbox background (unchecked). |
| `--nizel-task-checked-background` | Checkbox background and border color (checked). |
| `--nizel-task-checked-foreground` | Checkmark color (checked). |

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

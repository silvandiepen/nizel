---
title: Task Lists
description: Render Markdown task-list metadata as view-only or editable checkboxes.
icon: ui/check-square
order: 18
---

# Task Lists

`nizel-plugin-task-list` renders parsed task-list items as checkbox markup.

Core Nizel parses `- [ ]` and `- [x]` markers into list item metadata. The plugin owns the rendered checkbox controls, so applications can choose static or editable behavior.

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

View-only mode is the default:

```ts
taskListPlugin({ mode: 'view' });
```

Editable mode renders enabled checkbox inputs:

```ts
taskListPlugin({ mode: 'edit' });
```

Editable mode only changes the rendered checkbox state in the browser. Persisting edits back to Markdown is application-owned.

## Styling

Use the standalone style entrypoint when loading plugin CSS selectively:

```ts
import 'nizel-style/plugins/task-list.css';
```

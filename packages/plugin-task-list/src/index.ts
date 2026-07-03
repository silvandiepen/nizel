import type { NizelBlockNode, NizelInlineNode, NizelPlugin, NizelRootNode } from 'nizel';

export type TaskListPluginMode = 'view' | 'edit';

export type TaskListPluginOptions = {
  mode?: TaskListPluginMode;
};

/**
 * Renders parsed task-list metadata as checkbox markup.
 */
export const taskListPlugin = (options: TaskListPluginOptions = {}): NizelPlugin => {
  const mode = options.mode ?? 'view';

  return {
    name: 'task-list',
    hooks: {
      afterParse(ast) {
        return transformTaskLists(ast, mode);
      },
    },
  };
};

/**
 * Adds checkbox markup to parsed task-list items.
 */
export const transformTaskLists = (
  ast: NizelRootNode,
  mode: TaskListPluginMode = 'view',
): NizelRootNode => {
  return { ...ast, children: ast.children.map((node) => transformBlock(node, mode)) };
};

/**
 * Recursively transforms task-list item blocks.
 */
const transformBlock = (node: NizelBlockNode, mode: TaskListPluginMode): NizelBlockNode => {
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, mode)) };
  if (node.type === 'list') {
    return {
      ...node,
      children: node.children.map((item) => {
        const children = item.children.map((child) => transformBlock(child, mode));
        return item.checked === undefined ? { ...item, children } : { ...item, children: addCheckbox(children, item.checked, mode) };
      }),
    };
  }
  if (node.type === 'customBlock') return { ...node, children: node.children?.map((child) => transformBlock(child, mode)) };
  return node;
};

/**
 * Adds checkbox markup to the first paragraph of a task item.
 */
const addCheckbox = (
  children: NizelBlockNode[],
  checked: boolean,
  mode: TaskListPluginMode,
): NizelBlockNode[] => {
  const paragraphIndex = children.findIndex((child) => child.type === 'paragraph');
  const checkbox = checkboxNode(checked, mode);

  if (paragraphIndex === -1) {
    return [{ type: 'paragraph', children: [checkbox] }, ...children];
  }

  return children.map((child, index) => {
    if (index !== paragraphIndex || child.type !== 'paragraph') return child;
    if (hasTaskCheckbox(child.children)) return child;

    return {
      ...child,
      children: [
        labelOpenNode(),
        checkbox,
        contentOpenNode(),
        ...child.children,
        contentCloseNode(),
        labelCloseNode(),
      ],
    };
  });
};

/**
 * Checks whether a paragraph was already transformed.
 */
const hasTaskCheckbox = (nodes: NizelInlineNode[]): boolean => {
  return nodes.some((node) => node.type === 'inlineHtml' && node.value.includes('data-nizel-task-checkbox'));
};

/**
 * Creates the checkbox input node.
 */
const checkboxNode = (checked: boolean, mode: TaskListPluginMode): NizelInlineNode => ({
  type: 'inlineHtml',
  value: `<input class="nizel-task-list__checkbox" data-nizel-task-checkbox type="checkbox"${checked ? ' checked' : ''}${mode === 'view' ? ' disabled' : ''}>`,
});

/**
 * Opens the task label wrapper.
 */
const labelOpenNode = (): NizelInlineNode => ({
  type: 'inlineHtml',
  value: '<label class="nizel-task-list__label">',
});

/**
 * Closes the task label wrapper.
 */
const labelCloseNode = (): NizelInlineNode => ({
  type: 'inlineHtml',
  value: '</label>',
});

/**
 * Opens the task text wrapper.
 */
const contentOpenNode = (): NizelInlineNode => ({
  type: 'inlineHtml',
  value: '<span class="nizel-task-list__content">',
});

/**
 * Closes the task text wrapper.
 */
const contentCloseNode = (): NizelInlineNode => ({
  type: 'inlineHtml',
  value: '</span>',
});

export default taskListPlugin;

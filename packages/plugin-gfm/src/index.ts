import type { NizelPlugin } from 'nizel';
import { alertPlugin } from 'nizel-plugin-alert';
import { autolinkPlugin } from 'nizel-plugin-autolink';
import { taskListPlugin, type TaskListPluginOptions } from 'nizel-plugin-task-list';

export type GfmPluginOptions = {
  alerts?: boolean;
  autolinks?: boolean;
  taskLists?: boolean | TaskListPluginOptions;
};

/**
 * Returns the opt-in plugin set that complements Nizel's built-in GFM-like features.
 */
export const gfmPlugins = (options: GfmPluginOptions = {}): NizelPlugin[] => [
  ...(options.autolinks === false ? [] : [autolinkPlugin()]),
  ...(options.alerts === false ? [] : [alertPlugin()]),
  ...(options.taskLists === false ? [] : [taskListPlugin(options.taskLists === true ? undefined : options.taskLists)]),
];

export const gfmPlugin = (options: GfmPluginOptions = {}): NizelPlugin => ({
  name: 'gfm',
  options: {
    plugins: gfmPlugins(options),
  },
});

export default gfmPlugin;

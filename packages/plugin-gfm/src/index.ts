import type { NizelPlugin } from 'nizel';
import { alertPlugin } from 'nizel-plugin-alert';
import { autolinkPlugin } from 'nizel-plugin-autolink';

export type GfmPluginOptions = {
  alerts?: boolean;
  autolinks?: boolean;
};

/**
 * Returns the opt-in plugin set that complements Nizel's built-in GFM-like features.
 */
export const gfmPlugins = (options: GfmPluginOptions = {}): NizelPlugin[] => [
  ...(options.autolinks === false ? [] : [autolinkPlugin()]),
  ...(options.alerts === false ? [] : [alertPlugin()]),
];

export const gfmPlugin = (options: GfmPluginOptions = {}): NizelPlugin => ({
  name: 'gfm',
  options: {
    plugins: gfmPlugins(options),
  },
});

export default gfmPlugin;

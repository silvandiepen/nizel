import { defineNizelPlugin, type NizelAutolinkOptions, type NizelPlugin } from 'nizel';

export type AutolinkPluginOptions = NizelAutolinkOptions;

/**
 * Normalizes autolink plugin options for Nizel's core autolink configuration.
 */
export const resolveAutolinkPluginOptions = (
  options: AutolinkPluginOptions = {},
): Required<Pick<NizelAutolinkOptions, 'enabled'>> & Omit<NizelAutolinkOptions, 'enabled'> => {
  return {
    enabled: options.enabled ?? true,
    target: options.target,
    rel: options.rel,
  };
};

/**
 * Creates a plugin that configures Nizel's built-in bare URL and email autolink behavior.
 */
export const autolinkPlugin = (options: AutolinkPluginOptions = {}): NizelPlugin => {
  return defineNizelPlugin({
    name: 'autolink',
    options: {
      autolinks: resolveAutolinkPluginOptions(options),
    },
  });
};

export default autolinkPlugin;

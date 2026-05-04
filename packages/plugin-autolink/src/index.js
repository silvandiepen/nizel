import { defineNizelPlugin } from 'nizel';

/**
 * Creates a plugin that configures Nizel's built-in autolink behavior.
 */
export function autolinkPlugin(options = {}) {
  return defineNizelPlugin({
    name: 'autolink',
    options: {
      autolinks: {
        enabled: options.enabled ?? true,
        target: options.target,
        rel: options.rel,
      },
    },
  });
}

export default autolinkPlugin;

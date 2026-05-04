import type { NizelPlugin } from '../types.js';

/**
 * Defines a Nizel plugin without altering the provided plugin object.
 */
export const defineNizelPlugin = (plugin: NizelPlugin): NizelPlugin => {
  return plugin;
};

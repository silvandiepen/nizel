import type { NizelBlockDefinition } from '../types.js';

/**
 * Defines a custom Nizel block while preserving its inferred option type.
 */
export const defineBlock = <TOptions = Record<string, unknown>>(
  block: NizelBlockDefinition<TOptions>,
): NizelBlockDefinition<TOptions> => {
  return block;
};

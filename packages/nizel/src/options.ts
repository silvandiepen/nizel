import { defaultFilters, defaultOptions } from './defaults.js';
import type { NizelOptions, NizelPlugin, NizelTemplateOptions } from './types.js';

/**
 * Resolves defaults, plugins, processor options, and runtime options into one
 * effective options object using the documented priority order.
 */
export function resolveOptions<TMeta extends Record<string, unknown>>(
  baseOptions: NizelOptions<TMeta> = {},
  runtimeOptions: NizelOptions<TMeta> = {},
): NizelOptions<TMeta> {
  const plugins = [
    ...((baseOptions.plugins as NizelPlugin[] | undefined) ?? []),
    ...((runtimeOptions.plugins as NizelPlugin[] | undefined) ?? []),
  ];

  const pluginOptions = plugins.reduce<NizelOptions>((merged, plugin) => {
    const pluginTemplate = plugin.template ?? (plugin.filters ? { filters: plugin.filters } : undefined);
    return mergeOptions(merged, {
      ...plugin.options,
      elements: plugin.elements,
      blocks: plugin.blocks,
      transforms: plugin.transforms,
      template: pluginTemplate,
    });
  }, {});

  return mergeOptions(
    mergeOptions(mergeOptions(defaultOptions, pluginOptions), baseOptions),
    runtimeOptions,
  ) as NizelOptions<TMeta>;
}

/**
 * Merges two option layers, preserving nested maps instead of replacing them.
 */
function mergeOptions(
  left: NizelOptions,
  right: NizelOptions | undefined,
): NizelOptions {
  if (!right) return left;

  return {
    ...left,
    ...right,
    data: {
      ...(left.data ?? {}),
      ...(right.data ?? {}),
    },
    variables: {
      ...(left.variables ?? {}),
      ...(right.variables ?? {}),
    },
    elements: {
      ...(left.elements ?? {}),
      ...(right.elements ?? {}),
    },
    blocks: {
      ...(left.blocks ?? {}),
      ...(right.blocks ?? {}),
    },
    transforms: [...(left.transforms ?? []), ...(right.transforms ?? [])],
    template: mergeTemplateOptions(left.template, right.template),
  };
}

/**
 * Merges template options while preserving an explicit disabled template mode.
 */
function mergeTemplateOptions(
  left: NizelOptions['template'],
  right: NizelOptions['template'],
): boolean | NizelTemplateOptions {
  if (right === false) return false;
  if (left === false && right === undefined) return false;
  if (left === false && right === true) return {};
  if (left === false) left = {};
  if (right === true || right === undefined) right = {};
  if (left === true || left === undefined) left = {};

  return {
    ...left,
    ...right,
    filters: {
      ...defaultFilters,
      ...left.filters,
      ...right.filters,
    },
  };
}

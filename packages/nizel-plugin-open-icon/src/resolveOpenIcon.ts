import type { OpenIconPluginOptions, ResolvedOpenIcon } from './types.js';

const ICON_NAME_PATTERN = /^[A-Za-z0-9/_\-.]+$/;

export const isValidOpenIconName = (name: string): boolean => {
  if (!ICON_NAME_PATTERN.test(name)) return false;
  if (name.startsWith('/') || name.endsWith('/')) return false;
  return name.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
};

export const resolveOpenIcon = (
  name: string,
  aliases: NonNullable<OpenIconPluginOptions['aliases']> = {},
): ResolvedOpenIcon => {
  if (!isValidOpenIconName(name)) return { name, error: `Invalid Open Icon name: ${name}` };

  const seen = new Set<string>();
  let current = name;
  for (let depth = 0; depth < 8; depth += 1) {
    const next = aliases[current];
    if (!next) {
      if (!isValidOpenIconName(current)) return { name: current, original: current === name ? undefined : name, error: `Invalid Open Icon name: ${current}` };
      return { name: current, original: current === name ? undefined : name };
    }
    if (seen.has(current)) return { name: current, original: name, error: `Open Icon alias loop for ${name}` };
    seen.add(current);
    current = next;
    if (!isValidOpenIconName(current)) return { name: current, original: name, error: `Invalid Open Icon alias target: ${current}` };
  }

  return { name: current, original: name, error: `Open Icon alias resolution exceeded maximum depth for ${name}` };
};

import { slugCase } from '@sil/case';

/**
 * Escapes a value for safe HTML text or attribute output.
 */
export const escapeHtml = (value: unknown): string => {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
};

/**
 * Converts arbitrary heading or filter text into a URL-safe slug.
 */
export const slugify = (value: string, style: 'github' | 'classic' = 'github'): string => {
  if (style === 'classic') {
    return value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
  }
  return slugCase(value);
};

/**
 * Converts unknown template/filter values into displayable text.
 */
export const textFromUnknown = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

/**
 * Resolves a dotted path such as `meta.title` against a plain object.
 */
export const getPath = (source: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce<unknown>((value, part) => {
    if (value && typeof value === 'object' && part in value) {
      return (value as Record<string, unknown>)[part];
    }

    return undefined;
  }, source);
};

/**
 * Returns a stable unique slug by suffixing repeated bases with an increment.
 */
export const uniqueSlug = (base: string, seen: Map<string, number>): string => {
  const fallback = base || 'section';
  const count = seen.get(fallback) ?? 0;
  seen.set(fallback, count + 1);
  return count === 0 ? fallback : `${fallback}-${count + 1}`;
};

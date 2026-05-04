import type { NizelAutolinkOptions } from '../types.js';

/**
 * Removes punctuation that should not be included in an autolink href.
 */
export const trimTrailingPunctuation = (source: string): string => {
  return source.replace(/[),.;:!?]+$/g, '');
};

/**
 * Normalizes boolean or object autolink options.
 */
export const getAutolinkOptions = (
  options: boolean | NizelAutolinkOptions | undefined,
): NizelAutolinkOptions => {
  return typeof options === 'object' ? options : { enabled: options !== false };
};

/**
 * Determines whether a link href points to an external URL.
 */
export const isExternalHref = (href: string): boolean => {
  return /^(?:https?:)?\/\//.test(href);
};

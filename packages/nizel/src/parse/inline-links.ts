import { decodeStringContent, normalizeReferenceLabelForLookup, type ReferenceDefinition } from './common.js';
import { isValidInlineHtmlToken } from './html.js';

export type InlineReferenceState = {
  references: Map<string, ReferenceDefinition>;
};

/**
 * Finds the next inline link or image label opener.
 */
export const nextInlineLabelOpener = (source: string, startIndex: number): number => {
  for (let index = startIndex; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '[') return index;
    if (source[index] === '!' && source[index + 1] === '[') return index;
  }
  return -1;
};

/**
 * Finds a matching closing bracket for an inline label.
 */
export const findBalancedLabelEnd = (source: string, startIndex: number): number => {
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '`') {
      const ticks = /^`+/.exec(source.slice(index))?.[0] ?? '`';
      const close = source.indexOf(ticks, index + ticks.length);
      if (close !== -1) {
        index = close + ticks.length - 1;
        continue;
      }
    }
    if (source[index] === '<') {
      const close = source.indexOf('>', index + 1);
      if (close !== -1) {
        const token = source.slice(index, close + 1);
        if (isAutolinkToken(token) || isValidInlineHtmlToken(token)) {
          index = close;
          continue;
        }
      }
    }
    if (source[index] === '[') {
      depth += 1;
      continue;
    }
    if (source[index] === ']') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }
  return -1;
};

/**
 * Checks whether a label contains an inline link, which cannot nest inside another link.
 */
export const containsInlineLink = (label: string): boolean => {
  return /(?<!!)\[[^\]]+\](?:\(|\[)/.test(label);
};

/**
 * Checks whether a bracketed token is a CommonMark autolink.
 */
export const isAutolinkToken = (token: string): boolean => {
  return /^<[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*>$/.test(token) ||
    /^<[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*>$/i.test(token);
};

/**
 * Reads a full or collapsed reference link destination after a balanced label.
 */
export const readInlineReferenceDestination = (
  source: string,
  labelEnd: number,
  label: string,
  state: InlineReferenceState,
): { href: string; title?: string; endIndex: number } | null => {
  if (source[labelEnd + 1] !== '[') return null;
  const referenceEnd = findReferenceLabelEnd(source, labelEnd + 2);
  if (referenceEnd === -1) return null;

  const referenceLabel = source.slice(labelEnd + 2, referenceEnd);
  const reference = state.references.get(normalizeReferenceLabelForLookup(referenceLabel || label));
  if (!reference) return null;
  return {
    href: reference.href,
    title: reference.title,
    endIndex: referenceEnd,
  };
};

/**
 * Reads the closing bracket for an unresolved full or collapsed reference.
 */
export const readUnresolvedInlineReferenceEnd = (source: string, labelEnd: number): number => {
  if (source[labelEnd + 1] !== '[') return -1;
  return findReferenceLabelEnd(source, labelEnd + 2);
};

/**
 * Checks whether the unresolved reference label can become the next link text.
 */
export const canTailBecomeReferenceLink = (
  source: string,
  unresolvedReferenceEnd: number,
  referenceLabel: string,
  state: InlineReferenceState,
): boolean => {
  return readInlineReferenceDestination(source, unresolvedReferenceEnd, referenceLabel, state) !== null;
};

/**
 * Finds the end of a reference label, where nested unescaped brackets are invalid.
 */
export const findReferenceLabelEnd = (source: string, startIndex: number): number => {
  for (let index = startIndex; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '[') return -1;
    if (source[index] === ']') return index;
  }
  return -1;
};

/**
 * Reads a CommonMark inline link destination and optional title.
 */
export const readInlineDestination = (
  source: string,
  openParenIndex: number,
): { href: string; title?: string; endIndex: number } | null => {
  if (source[openParenIndex] !== '(') return null;
  let cursor = openParenIndex + 1;
  while (/[ \t\n]/.test(source[cursor] ?? '')) cursor += 1;

  let href = '';
  if (source[cursor] === '<') {
    const close = source.indexOf('>', cursor + 1);
    if (close === -1) return null;
    href = source.slice(cursor + 1, close);
    if (/[<>\\\n]/.test(href)) return null;
    cursor = close + 1;
  } else {
    let depth = 0;
    while (cursor < source.length) {
      const character = source[cursor];
      if (character === '\\' && source[cursor + 1]) {
        if (/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(source[cursor + 1])) {
          href += source[cursor + 1];
          cursor += 2;
        } else {
          href += character;
          cursor += 1;
        }
        continue;
      }
      if (character === '(') {
        depth += 1;
        href += character;
        cursor += 1;
        continue;
      }
      if (character === ')') {
        if (depth === 0) break;
        depth -= 1;
        href += character;
        cursor += 1;
        continue;
      }
      if (/[ \t\n]/.test(character) && depth === 0) break;
      href += character;
      cursor += 1;
    }
    if (depth !== 0) return null;
  }

  let title: string | undefined;
  const beforeTitle = cursor;
  while (/[ \t\n]/.test(source[cursor] ?? '')) cursor += 1;
  if (cursor > beforeTitle && ['"', "'", '('].includes(source[cursor])) {
    const opener = source[cursor];
    const closer = opener === '(' ? ')' : opener;
    cursor += 1;
    let value = '';
    while (cursor < source.length) {
      if (source[cursor] === '\\' && source[cursor + 1]) {
        value += source[cursor + 1];
        cursor += 2;
        continue;
      }
      if (source[cursor] === closer) break;
      value += source[cursor];
      cursor += 1;
    }
    if (source[cursor] !== closer) return null;
    title = value;
    cursor += 1;
    while (/[ \t\n]/.test(source[cursor] ?? '')) cursor += 1;
  }

  if (source[cursor] !== ')') return null;
  return { href, title, endIndex: cursor };
};

/**
 * Removes optional CommonMark angle brackets around inline link destinations.
 */
export const normalizeInlineDestination = (destination: string): string => {
  return destination.startsWith('<') && destination.endsWith('>')
    ? destination.slice(1, -1)
    : destination;
};

/**
 * Reads a decoded inline title from double, single, or parenthesized title groups.
 */
export const inlineTitleFromGroups = (
  groups: Record<string, string | undefined>,
  prefix: string,
): string | undefined => {
  const title = groups[prefix] ?? groups[`${prefix}Single`] ?? groups[`${prefix}Paren`];
  return title === undefined ? undefined : decodeStringContent(title);
};

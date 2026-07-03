import type { BadgeMarkdownOptions, ParsedBadgeExpression } from './types.js';

const SUPPORTED_OPTIONS = new Set(['tone', 'title', 'className']);

export const parseBadgeExpression = (source: string): ParsedBadgeExpression | null => {
  const trimmed = source.trim();
  if (!trimmed.startsWith(':badge(') || !trimmed.endsWith(')')) return null;
  const body = trimmed.slice(':badge('.length, -1).trim();
  if (!body) return null;

  const parts = splitArguments(body);
  const rawLabel = parts.shift()?.trim();
  if (!rawLabel || rawLabel.includes('=')) return null;

  const options: BadgeMarkdownOptions = {};
  for (const part of parts) {
    const parsed = parseNamedOption(part);
    if (!parsed) return null;
    const [key, value] = parsed;
    options[key] = value;
  }

  return { label: unquoteValue(rawLabel), options };
};

export const findBadgeExpressionEnd = (source: string, startIndex: number): number => {
  const open = startIndex + ':badge'.length;
  if (source[open] !== '(') return -1;

  let quote: '"' | "'" | undefined;
  for (let index = open + 1; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== '\\') quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ')' && isExpressionBoundary(source[index + 1])) return index + 1;
  }
  return -1;
};

const isExpressionBoundary = (char: string | undefined): boolean => {
  return char === undefined || /[\s.,;:!?}\]]/.test(char);
};

const splitArguments = (source: string): string[] => {
  const parts: string[] = [];
  let quote: '"' | "'" | undefined;
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== '\\') quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ',') {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
};

const parseNamedOption = (source: string): [keyof BadgeMarkdownOptions, string] | null => {
  const equals = source.indexOf('=');
  if (equals <= 0) return null;

  const key = source.slice(0, equals).trim();
  if (!SUPPORTED_OPTIONS.has(key)) return null;

  const rawValue = source.slice(equals + 1).trim();
  if (!rawValue || rawValue.startsWith('{') || rawValue.endsWith('}')) return null;
  return [key as keyof BadgeMarkdownOptions, unquoteValue(rawValue)];
};

const unquoteValue = (value: string): string => {
  const quoted = /^"((?:\\.|[^"\\])*)"$|^'((?:\\.|[^'\\])*)'$/.exec(value);
  if (quoted) return unescapeQuoted(quoted[1] ?? quoted[2] ?? '');
  return value;
};

const unescapeQuoted = (value: string): string => value.replace(/\\(["'\\])/g, '$1');

import type { OpenIconMarkdownOptions, ParsedOpenIconExpression } from './types.js';

const SUPPORTED_OPTIONS = new Set([
  'label',
  'size',
  'color',
  'fill',
  'fillSecondary',
  'stroke',
  'strokeSecondary',
  'opacity',
  'strokeWidth',
  'className',
]);

export const parseOpenIconExpression = (source: string): ParsedOpenIconExpression | null => {
  const trimmed = source.trim();
  if (!trimmed.startsWith(':open-icon(') || !trimmed.endsWith(')')) return null;
  const body = trimmed.slice(':open-icon('.length, -1).trim();
  if (!body) return null;

  const parts = splitArguments(body);
  const name = parts.shift()?.trim();
  if (!name || name.includes('=')) return null;

  const options: OpenIconMarkdownOptions = {};
  for (const part of parts) {
    const parsed = parseNamedOption(part);
    if (!parsed) return null;
    const [key, value] = parsed;
    (options as Record<string, string | number>)[key] = value;
  }

  return { name, options };
};

export const findOpenIconExpressionEnd = (source: string, startIndex: number): number => {
  const open = startIndex + ':open-icon'.length;
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
    if (char === ')') return index + 1;
  }
  return -1;
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

const parseNamedOption = (source: string): [keyof OpenIconMarkdownOptions, string | number] | null => {
  const equals = source.indexOf('=');
  if (equals <= 0) return null;

  const key = source.slice(0, equals).trim();
  if (!SUPPORTED_OPTIONS.has(key)) return null;

  const rawValue = source.slice(equals + 1).trim();
  if (!rawValue || rawValue.startsWith('{') || rawValue.endsWith('}')) return null;

  const quoted = /^"((?:\\.|[^"\\])*)"$|^'((?:\\.|[^'\\])*)'$/.exec(rawValue);
  if (quoted) return [key as keyof OpenIconMarkdownOptions, unescapeQuoted(quoted[1] ?? quoted[2] ?? '')];

  if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) return [key as keyof OpenIconMarkdownOptions, Number(rawValue)];
  if (/^[A-Za-z0-9_./%#(), -]+$/.test(rawValue)) return [key as keyof OpenIconMarkdownOptions, rawValue];
  return null;
};

const unescapeQuoted = (value: string): string => value.replace(/\\(["'\\])/g, '$1');

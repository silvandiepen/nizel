import type { NizelTemplateFilter, NizelTemplateOptions } from './types.js';
import { escapeHtml, getPath, textFromUnknown } from './utils.js';

/**
 * Replaces Nizel template expressions in a Markdown string.
 */
export const renderTemplate = (
  markdown: string,
  data: Record<string, unknown>,
  options: NizelTemplateOptions,
): string => {
  const filters = options.filters ?? {};
  const missing = options.missing ?? 'keep';
  const rawEnabled = options.raw ?? false;

  return markdown.replace(
    /\{\{\{\s*([^}]+)\s*\}\}\}|\{\{\s*([^}]+)\s*\}\}/g,
    (match, rawExpression: string | undefined, escapedExpression: string) => {
      const isRaw = rawExpression !== undefined;
      if (isRaw && !rawEnabled) return match;

      const expression = (rawExpression ?? escapedExpression).trim();
      const value = evaluateExpression(expression, data, filters);

      if (value === undefined) {
        if (missing === 'error') {
          throw new Error(`Missing template value: ${expression}`);
        }

        return missing === 'empty' ? '' : match;
      }

      const text = textFromUnknown(value);
      return isRaw ? text : escapeHtml(text);
    },
  );
};

/**
 * Resolves one template expression and applies its filter pipeline.
 */
const evaluateExpression = (
  expression: string,
  data: Record<string, unknown>,
  filters: Record<string, NizelTemplateFilter>,
): unknown => {
  const [path, ...filterParts] = expression.split('|').map((part) => part.trim());
  let value = getPath(data, path);

  for (const part of filterParts) {
    const { name, args } = parseFilter(part);
    const filter = filters[name];
    if (!filter) continue;
    value = filter(textFromUnknown(value), ...args);
  }

  return value;
};

/**
 * Parses a filter invocation such as `format('currency', 'EUR')`.
 */
const parseFilter = (source: string): { name: string; args: unknown[] } => {
  const call = /^([A-Za-z0-9_-]+)\((.*)\)$/.exec(source);
  if (!call) return { name: source, args: [] };

  return {
    name: call[1],
    args: splitArgs(call[2]).map((arg) => {
      const trimmed = arg.trim();
      if (/^['"].*['"]$/.test(trimmed)) return trimmed.slice(1, -1);
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
      return trimmed;
    }),
  };
};

/**
 * Splits comma-delimited filter arguments while preserving quoted commas.
 */
const splitArgs = (source: string): string[] => {
  if (!source.trim()) return [];

  const args: string[] = [];
  let current = '';
  let quote: string | undefined;

  for (const char of source) {
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
    } else if (char === quote) {
      quote = undefined;
    }

    if (char === ',' && !quote) {
      args.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  args.push(current);
  return args;
};

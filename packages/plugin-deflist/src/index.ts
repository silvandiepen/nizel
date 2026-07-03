import type { NizelHtmlToMarkdownHandler, NizelPlugin } from 'nizel';
import { htmlChildElements } from 'nizel';

export type DefinitionEntry = {
  term: string;
  definitions: string[];
};

export type DeflistPluginOptions = {
  className?: string;
};

type DeflistValue = {
  entries: DefinitionEntry[];
};

/**
 * Creates a definition list plugin for `Term` followed by `: Definition` lines.
 */
export const deflistPlugin = (options: DeflistPluginOptions = {}): NizelPlugin => {
  return {
    name: 'deflist',
    blocks: {
      deflist: {
        name: 'deflist',
        parse({ content }): DeflistValue {
          const parsed = readDefinitionList(content.split('\n'), 0);
          return { entries: parsed?.entries ?? [] };
        },
        formats: {
          html(node) {
            if (node.type !== 'customBlock' || !isDeflistValue(node.value)) return '';
            return renderDefinitionList(node.value.entries, options);
          },
        },
      },
    },
    hooks: {
      beforeParse(markdown) {
        return transformDefinitionLists(markdown, options);
      },
    },
    htmlToMarkdown: deflistToMarkdown(options),
  };
};

/**
 * Converts rendered definition lists back into `Term` / `: Definition` Markdown.
 * Only claims `<dl>` matching the plugin's configured class (so other `<dl>` output is left alone).
 */
export const deflistToMarkdown = (options: DeflistPluginOptions = {}): NizelHtmlToMarkdownHandler => (node, ctx) => {
  if (node.type !== 'element' || node.tag !== 'dl') return undefined;
  if (options.className) {
    if (node.attrs.class !== options.className) return undefined;
  } else if (node.attrs.class !== undefined) {
    return undefined;
  }

  const lines: string[] = [];
  for (const el of htmlChildElements(node)) {
    if (el.tag === 'dt') lines.push(ctx.inline(el));
    else if (el.tag === 'dd') lines.push(`: ${ctx.inline(el)}`);
  }
  return lines.join('\n');
};

/**
 * Converts definition-list source groups to safe inline HTML blocks.
 */
export const transformDefinitionLists = (markdown: string, _options: DeflistPluginOptions = {}): string => {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const parsed = readDefinitionList(lines, index);
    if (!parsed) {
      result.push(lines[index]);
      index += 1;
      continue;
    }

    result.push(renderDefinitionBlockSource(parsed.lines));
    index = parsed.nextIndex;
  }

  return result.join('\n');
};

/**
 * Reads a contiguous definition list group from a line array.
 */
export const readDefinitionList = (
  lines: string[],
  startIndex: number,
): { entries: DefinitionEntry[]; lines: string[]; nextIndex: number } | null => {
  if (!isDefinitionTermStart(lines, startIndex)) return null;

  const entries: DefinitionEntry[] = [];
  const sourceLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && isDefinitionTermStart(lines, index)) {
    const term = lines[index].trim();
    const definitions: string[] = [];
    sourceLines.push(lines[index]);
    index += 1;

    while (index < lines.length && isDefinitionLine(lines[index])) {
      definitions.push(lines[index].trimStart().slice(2).trim());
      sourceLines.push(lines[index]);
      index += 1;
    }

    entries.push({ term, definitions });

    const next = nextNonBlankLine(lines, index);
    if (next === -1 || !isDefinitionTermStart(lines, next)) break;
    while (index < next) {
      sourceLines.push(lines[index]);
      index += 1;
    }
    index = next;
  }

  return { entries, lines: sourceLines, nextIndex: index };
};

/**
 * Renders definition list entries to escaped HTML.
 */
export const renderDefinitionList = (
  entries: DefinitionEntry[],
  options: DeflistPluginOptions = {},
): string => {
  const classAttribute = options.className ? ` class="${escapeHtml(options.className)}"` : '';
  const body = entries
    .map((entry) => {
      const definitions = entry.definitions
        .map((definition) => `  <dd>${escapeHtml(definition)}</dd>`)
        .join('\n');
      return `  <dt>${escapeHtml(entry.term)}</dt>\n${definitions}`;
    })
    .join('\n');

  return `<dl${classAttribute}>\n${body}\n</dl>`;
};

/**
 * Checks whether a line begins a definition list term.
 */
const isDefinitionTermStart = (lines: string[], index: number): boolean => {
  return Boolean(lines[index]?.trim() && !isDefinitionLine(lines[index]) && isDefinitionLine(lines[index + 1] ?? ''));
};

/**
 * Checks whether a line is a definition item line.
 */
const isDefinitionLine = (line: string): boolean => line.trimStart().startsWith(': ');

/**
 * Finds the next non-blank line index.
 */
const nextNonBlankLine = (lines: string[], startIndex: number): number => {
  let index = startIndex;
  while (index < lines.length && !lines[index].trim()) index += 1;
  return index < lines.length ? index : -1;
};

/**
 * Escapes HTML-sensitive characters in definition list content.
 */
const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Renders definition list source into an internal custom block.
 */
const renderDefinitionBlockSource = (lines: string[]): string => {
  return ['::deflist', ...lines, '::'].join('\n');
};

/**
 * Checks that a custom block value was produced by the deflist parser.
 */
const isDeflistValue = (value: unknown): value is DeflistValue => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DeflistValue>;
  return Array.isArray(candidate.entries);
};

export default deflistPlugin;

import type { NizelInlineNode, NizelTableNode } from '../types.js';

export type TableInlineParser<TOptions> = (source: string, options: TOptions) => NizelInlineNode[];

/**
 * Checks whether the current line starts a pipe table.
 */
export const isTableStart = (lines: string[], index: number): boolean => {
  return Boolean(
    lines[index]?.includes('|') &&
      lines[index + 1] &&
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]),
  );
};

/**
 * Reads a pipe table into a normalized table node.
 */
export const readTable = <TOptions>(
  lines: string[],
  startIndex: number,
  options: TOptions,
  parseInline: TableInlineParser<TOptions>,
): { table: NizelTableNode; endIndex: number } => {
  const headers = splitTableRow(lines[startIndex]);
  const align = splitTableRow(lines[startIndex + 1]).map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.endsWith(':')) return 'right';
    if (trimmed.startsWith(':')) return 'left';
    return null;
  });
  const rows = [
    {
      type: 'tableRow' as const,
      children: headers.map((cell) => ({
        type: 'tableCell' as const,
        children: parseInline(cell.trim(), options),
      })),
    },
  ];

  let index = startIndex + 2;
  while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
    rows.push({
      type: 'tableRow',
      children: splitTableRow(lines[index]).map((cell) => ({
        type: 'tableCell',
        children: parseInline(cell.trim(), options),
      })),
    });
    index += 1;
  }

  return { table: { type: 'table', align, children: rows }, endIndex: index - 1 };
};

/**
 * Splits a pipe table row into cells.
 */
export const splitTableRow = (line: string): string[] => {
  return line.trim().replace(/^\||\|$/g, '').split('|');
};

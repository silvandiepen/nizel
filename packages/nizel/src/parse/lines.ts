/**
 * Expands leading tabs according to CommonMark column stops.
 */
export const expandLeadingTabs = (markdown: string): string => {
  return markdown
    .split('\n')
    .map((line) => {
      let result = '';
      let column = 0;
      let cursor = 0;
      while (cursor < line.length) {
        const character = line[cursor];
        if (character === '\t') {
          const spaces = 4 - (column % 4);
          result += ' '.repeat(spaces);
          column += spaces;
          cursor += 1;
          continue;
        }
        result += character;
        column += 1;
        cursor += 1;
        if (character !== ' ') break;
      }
      return result + line.slice(cursor);
    })
    .join('\n');
};

/**
 * Expands leading tabs in a line after a block marker has already consumed columns.
 */
export const expandLeadingTabsFromColumn = (line: string, startColumn: number): string => {
  let result = '';
  let column = startColumn;
  let inLeadingIndent = true;

  for (const character of line) {
    if (character === '\t' && inLeadingIndent) {
      const spaces = 4 - (column % 4);
      result += ' '.repeat(spaces);
      column += spaces;
      continue;
    }

    result += character;
    column += 1;
    if (character !== ' ') inLeadingIndent = false;
  }

  return result;
};

/**
 * Finds the next line containing non-space content.
 */
export const nextNonBlankLine = (lines: string[], startIndex: number): number => {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim()) return index;
  }
  return -1;
};

/**
 * Counts leading spaces in a normalized line.
 */
export const countLeadingSpaces = (line: string): number => {
  let count = 0;
  while (line[count] === ' ') {
    count += 1;
  }
  return count;
};

/**
 * Removes up to a requested number of leading spaces.
 */
export const stripLeadingSpaces = (line: string, spaces: number): string => {
  let cursor = 0;
  while (cursor < spaces && line[cursor] === ' ') {
    cursor += 1;
  }
  return line.slice(cursor);
};

/**
 * Trims blank lines at the end of an indented code block.
 */
export const trimTrailingBlankLines = (lines: string[]): string[] => {
  const result = [...lines];
  while (result.length > 0 && !result[result.length - 1].trim()) result.pop();
  return result;
};

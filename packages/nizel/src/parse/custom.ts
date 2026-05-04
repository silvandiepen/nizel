/**
 * Reads a custom block body, optional props section, and closing delimiter.
 */
export const readCustomBlock = (lines: string[], startIndex: number): {
  props: Record<string, unknown>;
  content: string;
  endIndex: number;
} => {
  const firstDelimiter = findDelimiter(lines, startIndex + 1);
  if (firstDelimiter === -1) {
    return {
      props: {},
      content: lines.slice(startIndex + 1).join('\n'),
      endIndex: lines.length - 1,
    };
  }

  const beforeDelimiter = lines.slice(startIndex + 1, firstDelimiter);
  if (beforeDelimiter.length > 0 && beforeDelimiter.every(isPropOrBlank)) {
    const closingDelimiter = findDelimiter(lines, firstDelimiter + 1);
    return {
      props: parseProps(beforeDelimiter),
      content: lines
        .slice(firstDelimiter + 1, closingDelimiter === -1 ? lines.length : closingDelimiter)
        .join('\n'),
      endIndex: closingDelimiter === -1 ? lines.length - 1 : closingDelimiter,
    };
  }

  return {
    props: {},
    content: beforeDelimiter.join('\n'),
    endIndex: firstDelimiter,
  };
};

/**
 * Finds the next custom block delimiter from a starting line index.
 */
export const findDelimiter = (lines: string[], startIndex: number): number => {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim() === '::') return index;
  }
  return -1;
};

/**
 * Checks whether a line can be part of a custom block props section.
 */
export const isPropOrBlank = (line: string): boolean => {
  return !line.trim() || /^[A-Za-z0-9_-]+:\s*.*$/.test(line.trim());
};

/**
 * Parses key-value custom block props.
 */
export const parseProps = (lines: string[]): Record<string, unknown> => {
  const props: Record<string, unknown> = {};
  for (const line of lines) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    props[match[1]] = parsePrimitive(match[2]);
  }
  return props;
};

/**
 * Coerces a custom block prop scalar into a JavaScript primitive.
 */
export const parsePrimitive = (value: string): unknown => {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, '');
};

/**
 * Splits a custom block argument string into whitespace-separated words.
 */
export const splitWords = (source: string): string[] => {
  return source.trim() ? source.trim().split(/\s+/) : [];
};

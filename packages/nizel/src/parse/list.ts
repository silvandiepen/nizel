export type ListMarker = {
  body: string;
  contentIndent: number;
  marker: string;
  ordered: boolean;
  start?: number;
};

/**
 * Parses a CommonMark list marker and its content indentation.
 */
export const parseListMarker = (line: string): ListMarker | null => {
  const expanded = line.includes('\t') ? expandListMarkerTabs(line) : line;
  const unordered = /^( {0,3})([-*+])([ \t]*)(.*)$/.exec(expanded);
  if (unordered && (unordered[3].length > 0 || unordered[4] === '')) {
    return {
      body: listMarkerBody(unordered[3], unordered[4]),
      contentIndent: listContentIndent(unordered[1].length, unordered[2].length, unordered[3].length),
      marker: unordered[2],
      ordered: false,
    };
  }

  const ordered = /^( {0,3})(\d{1,9})([.)])([ \t]*)(.*)$/.exec(expanded);
  if (ordered && (ordered[4].length > 0 || ordered[5] === '')) {
    return {
      body: listMarkerBody(ordered[4], ordered[5]),
      contentIndent: listContentIndent(ordered[1].length, ordered[2].length + 1, ordered[4].length),
      marker: ordered[3],
      ordered: true,
      start: Number(ordered[2]),
    };
  }

  return null;
};

/**
 * Restores padding beyond CommonMark's list marker indentation limit as body text.
 */
export const listMarkerBody = (padding: string, body: string): string => {
  return padding.length > 4 ? `${padding.slice(1)}${body}` : body;
};

/**
 * Expands tabs that contribute to list marker padding.
 */
export const expandListMarkerTabs = (line: string): string => {
  let result = '';
  let cursor = 0;
  let inMarkerPadding = false;

  while (cursor < line.length) {
    const character = line[cursor];
    if (character === '\t' && (inMarkerPadding || /^ {0,3}(?:[-*+]|\d{1,9}[.)])$/.test(result))) {
      const column = result.length;
      result += ' '.repeat(4 - (column % 4));
      inMarkerPadding = true;
      cursor += 1;
      continue;
    }

    result += character;
    if (/^ {0,3}(?:[-*+]|\d{1,9}[.)])$/.test(result)) {
      inMarkerPadding = true;
    } else if (inMarkerPadding && character !== ' ') {
      inMarkerPadding = false;
    }
    cursor += 1;
  }

  return result;
};

/**
 * Checks whether a marker belongs to the current homogeneous list.
 */
export const isSameListMarker = (opening: ListMarker, current: ListMarker): boolean => {
  return opening.ordered ? current.marker === opening.marker : current.marker === opening.marker;
};

/**
 * Checks whether a list marker is allowed to interrupt a paragraph.
 */
export const isParagraphInterruptingListMarker = (line: string): boolean => {
  const marker = parseListMarker(line);
  return marker !== null && marker.body !== '' && (!marker.ordered || marker.start === 1);
};

/**
 * Calculates the indentation column where list item content starts.
 */
export const listContentIndent = (indent: number, markerLength: number, padding: number): number => {
  return indent + markerLength + (padding > 0 && padding <= 4 ? padding : 1);
};

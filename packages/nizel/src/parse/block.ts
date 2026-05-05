/**
 * Checks whether a line is a simple raw HTML block tag.
 */
export const isRawHtmlBlockLine = (line: string): boolean => {
  return /^<\/?[A-Za-z][A-Za-z0-9-]*(?=[\s>/])[\s\S]*>$/.test(line.trim());
};

/**
 * Checks CommonMark thematic break marker runs with optional spaces.
 */
export const isThematicBreak = (line: string): boolean => {
  return /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/.test(line);
};

/**
 * Matches a valid setext heading underline.
 */
export const isSetextUnderline = (line: string): RegExpExecArray | null => {
  return /^ {0,3}(=+|-+)\s*$/.exec(line);
};

/**
 * Removes optional closing hash markers from an ATX heading.
 */
export const trimClosingHeadingHashes = (source: string): string => {
  if (/^#+\s*$/.test(source)) return '';
  return source.replace(/\s+#+\s*$/, '').trim();
};

/**
 * Removes up to three leading spaces from paragraph lines and preserves hard-break markers.
 */
export const normalizeParagraphLine = (line: string): string => {
  return line.replace(/^ {0,3}/, '').trimStart();
};

/**
 * Joins paragraph lines and removes spaces that only trail the paragraph.
 */
export const normalizeParagraphSource = (lines: string[]): string => {
  return lines.join('\n').replace(/[ \t]+$/, '');
};

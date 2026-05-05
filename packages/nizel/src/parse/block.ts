/**
 * Pre-compiled regex patterns for block parsing utilities.
 */
const RAW_HTML_BLOCK_TAG = /^<\/?[A-Za-z][A-Za-z0-9-]*(?=[\s>/])[\s\S]*>$/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)\s*$/;
const HASH_ONLY = /^#+\s*$/;
const TRAILING_HASHES = /\s+#+\s*$/;
const LEADING_SPACES = /^ {0,3}/;
const TRAILING_WHITESPACE = /[ \t]+$/;

/**
 * Checks whether a line is a simple raw HTML block tag.
 */
export const isRawHtmlBlockLine = (line: string): boolean => {
  return RAW_HTML_BLOCK_TAG.test(line.trim());
};

/**
 * Checks CommonMark thematic break marker runs with optional spaces.
 */
export const isThematicBreak = (line: string): boolean => {
  return THEMATIC_BREAK.test(line);
};

/**
 * Matches a valid setext heading underline.
 */
export const isSetextUnderline = (line: string): RegExpExecArray | null => {
  return SETEXT_UNDERLINE.exec(line);
};

/**
 * Removes optional closing hash markers from an ATX heading.
 */
export const trimClosingHeadingHashes = (source: string): string => {
  if (HASH_ONLY.test(source)) return '';
  return source.replace(TRAILING_HASHES, '').trim();
};

/**
 * Removes up to three leading spaces from paragraph lines and preserves hard-break markers.
 */
export const normalizeParagraphLine = (line: string): string => {
  return line.replace(LEADING_SPACES, '').trimStart();
};

/**
 * Joins paragraph lines and removes spaces that only trail the paragraph.
 */
export const normalizeParagraphSource = (lines: string[]): string => {
  return lines.join('\n').replace(TRAILING_WHITESPACE, '');
};

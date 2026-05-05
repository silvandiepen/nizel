/**
 * Pre-compiled regex patterns for HTML block parsing.
 */
const HTML_BLOCK_START = /^ {0,3}</;
const SPECIAL_HTML_START = /^<(script|pre|style|textarea)(?:\s|>|$)/i;
const SPECIAL_TAG_NAME = /^<([A-Za-z][A-Za-z0-9-]*)/;
const COMMENT_START = /^<!--/;
const PI_START = /^<\?/;
const DOCTYPE_START = /^<![A-Z]/;
const CDATA_START = /^<!\[CDATA\[/;
const INLINE_HTML_SPECIAL = /^(?:<!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)$/u;
const INLINE_TAG_OPEN = /^<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>\s*$/;
const INLINE_TAG_CLOSE = /^<\/[A-Za-z][A-Za-z0-9-]*\s*>\s*$/;
const BLOCK_TAG_START = /^<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s|\/?>|$)/;
const BLOCK_TAG_NAME = /^<\/?([A-Za-z][A-Za-z0-9-]*)/;
const MULTILINE_TAG_START = /^<[A-Za-z][A-Za-z0-9-]*(?:\s|>)/;
const INVALID_ATTR_SEQUENCE = /[A-Za-z0-9_.:-]![A-Za-z0-9_.:-]/;
const HAS_NEWLINE = /\n/;

const htmlBlockTags = new Set([
  'address',
  'article',
  'aside',
  'base',
  'basefont',
  'blockquote',
  'body',
  'caption',
  'center',
  'col',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'frame',
  'frameset',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hr',
  'html',
  'iframe',
  'legend',
  'li',
  'link',
  'main',
  'menu',
  'menuitem',
  'nav',
  'noframes',
  'ol',
  'optgroup',
  'option',
  'p',
  'param',
  'search',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'title',
  'tr',
  'track',
  'ul',
]);

/**
 * Reads a CommonMark raw HTML block.
 */
export const readHtmlBlock = (
  lines: string[],
  startIndex: number,
): { value: string; endIndex: number } | null => {
  const line = lines[startIndex];
  if (!HTML_BLOCK_START.test(line)) return null;

  const trimmed = line.trimStart();
  const closedBy = htmlBlockClosingPattern(trimmed);
  if (closedBy) {
    return readHtmlBlockUntil(lines, startIndex, closedBy);
  }

  if (isBlankTerminatedHtmlBlockStart(trimmed)) {
    return readHtmlBlockUntilBlank(lines, startIndex);
  }

  return null;
};

/**
 * Checks whether an HTML block start can interrupt an open paragraph.
 */
export const isInterruptingHtmlBlockStart = (line: string): boolean => {
  if (!HTML_BLOCK_START.test(line)) return false;
  const trimmed = line.trimStart();
  return htmlBlockClosingPattern(trimmed) !== null || isBlockTagHtmlBlockStart(trimmed);
};

/**
 * Checks CommonMark inline HTML validity.
 */
export const isValidInlineHtmlToken = (source: string): boolean => {
  if (INLINE_HTML_SPECIAL.test(source)) {
    return true;
  }
  if (isValidInlineHtmlTag(source)) return true;
  return HAS_NEWLINE.test(source) && MULTILINE_TAG_START.test(source) && !INVALID_ATTR_SEQUENCE.test(source);
};

/**
 * Pre-compiled closing patterns for HTML blocks.
 */
const COMMENT_CLOSE = /-->/;
const PI_CLOSE = /\?>/;
const DOCTYPE_CLOSE = />/;
const CDATA_CLOSE = /\]\]>/;

/**
 * Resolves special HTML block closing patterns.
 */
export const htmlBlockClosingPattern = (trimmed: string): RegExp | null => {
  if (SPECIAL_HTML_START.test(trimmed)) {
    return new RegExp(`</${SPECIAL_TAG_NAME.exec(trimmed)?.[1]}>`, 'i');
  }
  if (COMMENT_START.test(trimmed)) return COMMENT_CLOSE;
  if (PI_START.test(trimmed)) return PI_CLOSE;
  if (DOCTYPE_START.test(trimmed)) return DOCTYPE_CLOSE;
  if (CDATA_START.test(trimmed)) return CDATA_CLOSE;
  return null;
};

/**
 * Reads raw HTML lines through a matching closing pattern.
 */
export const readHtmlBlockUntil = (
  lines: string[],
  startIndex: number,
  close: RegExp,
): { value: string; endIndex: number } => {
  const html: string[] = [];
  let index = startIndex;
  while (index < lines.length) {
    html.push(lines[index]);
    if (close.test(lines[index])) break;
    index += 1;
  }
  return { value: html.join('\n'), endIndex: index };
};

/**
 * Checks whether an HTML block should run until the next blank line.
 */
export const isBlankTerminatedHtmlBlockStart = (trimmed: string): boolean => {
  if (isBlockTagHtmlBlockStart(trimmed)) return true;

  return isValidInlineHtmlTag(trimmed);
};

/**
 * Checks CommonMark's raw HTML tag shape for type 7 HTML blocks.
 */
export const isValidInlineHtmlTag = (source: string): boolean => {
  return INLINE_TAG_OPEN.test(source) || INLINE_TAG_CLOSE.test(source);
};

/**
 * Checks whether a line starts one of CommonMark's block HTML tags.
 */
export const isBlockTagHtmlBlockStart = (trimmed: string): boolean => {
  if (!BLOCK_TAG_START.test(trimmed)) return false;
  const tag = BLOCK_TAG_NAME.exec(trimmed)?.[1].toLowerCase();
  return tag !== undefined && htmlBlockTags.has(tag);
};

/**
 * Reads raw HTML lines until a blank line.
 */
export const readHtmlBlockUntilBlank = (
  lines: string[],
  startIndex: number,
): { value: string; endIndex: number } => {
  const html: string[] = [];
  let index = startIndex;
  while (index < lines.length && lines[index].trim()) {
    html.push(lines[index]);
    index += 1;
  }
  return { value: html.join('\n'), endIndex: index - 1 };
};

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
  if (!/^ {0,3}</.test(line)) return null;

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
  if (!/^ {0,3}</.test(line)) return false;
  const trimmed = line.trimStart();
  return htmlBlockClosingPattern(trimmed) !== null || isBlockTagHtmlBlockStart(trimmed);
};

/**
 * Checks CommonMark inline HTML validity.
 */
export const isValidInlineHtmlToken = (source: string): boolean => {
  if (/^(?:<!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>)$/u.test(source)) {
    return true;
  }
  if (isValidInlineHtmlTag(source)) return true;
  return /\n/.test(source) && /^<[A-Za-z][A-Za-z0-9-]*(?:\s|>)/.test(source) && !/[A-Za-z0-9_.:-]![A-Za-z0-9_.:-]/.test(source);
};

/**
 * Resolves special HTML block closing patterns.
 */
export const htmlBlockClosingPattern = (trimmed: string): RegExp | null => {
  if (/^<(script|pre|style|textarea)(?:\s|>|$)/i.test(trimmed)) {
    return new RegExp(`</${/^<([A-Za-z][A-Za-z0-9-]*)/.exec(trimmed)?.[1]}>`, 'i');
  }
  if (/^<!--/.test(trimmed)) return /-->/;
  if (/^<\?/.test(trimmed)) return /\?>/;
  if (/^<![A-Z]/.test(trimmed)) return />/;
  if (/^<!\[CDATA\[/.test(trimmed)) return /\]\]>/;
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
  return /^<[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>\s*$/.test(source) ||
    /^<\/[A-Za-z][A-Za-z0-9-]*\s*>\s*$/.test(source);
};

/**
 * Checks whether a line starts one of CommonMark's block HTML tags.
 */
export const isBlockTagHtmlBlockStart = (trimmed: string): boolean => {
  if (!/^<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s|\/?>|$)/.test(trimmed)) return false;
  const tag = /^<\/?([A-Za-z][A-Za-z0-9-]*)/.exec(trimmed)?.[1].toLowerCase();
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

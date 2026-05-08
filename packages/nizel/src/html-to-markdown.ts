export type NizelHtmlToMarkdownUnsupportedMode = 'preserve' | 'drop';

export type NizelHtmlToMarkdownOptions = {
  unsupported?: NizelHtmlToMarkdownUnsupportedMode;
};

type HtmlNode =
  | { type: 'root'; children: HtmlNode[] }
  | { type: 'text'; value: string }
  | { type: 'element'; tag: string; attrs: Record<string, string>; children: HtmlNode[]; raw: string }
  | { type: 'comment'; value: string };

const blockTags = new Set([
  'address', 'article', 'aside', 'blockquote', 'details', 'dialog', 'div', 'dl',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'header', 'hr', 'main',
  'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

const passthroughInlineTags = new Set(['abbr', 'bdi', 'bdo', 'cite', 'data', 'dfn', 'kbd', 'mark', 'q', 'samp', 'small', 'sub', 'sup', 'time', 'u', 'var']);

/**
 * Converts semantic HTML into Markdown, preserving unsupported HTML by default.
 */
export function htmlToMarkdown(html: string, options: NizelHtmlToMarkdownOptions = {}): string {
  const root = parseHtml(html);
  return normalizeDocument(renderChildren(root.children, { unsupported: options.unsupported ?? 'preserve' }, 0));
}

/**
 * Parses enough HTML structure for conservative Markdown conversion.
 */
function parseHtml(html: string): HtmlNode & { type: 'root' } {
  const root: HtmlNode & { type: 'root' } = { type: 'root', children: [] };
  const stack: Array<{ node: HtmlNode & { type: 'element' | 'root' }; start: number }> = [{ node: root, start: 0 }];
  const tokenPattern = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<\/?[A-Za-z][^>]*>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(html)) !== null) {
    appendText(html.slice(lastIndex, match.index));
    const token = match[0];
    lastIndex = tokenPattern.lastIndex;

    if (token.startsWith('<!--')) {
      current().children.push({ type: 'comment', value: token });
      continue;
    }

    if (/^<\//.test(token)) {
      const tag = token.slice(2, -1).trim().toLowerCase();
      closeTag(tag, tokenPattern.lastIndex);
      continue;
    }

    const open = /^<([A-Za-z][^\s/>]*)([\s\S]*?)\/?>$/.exec(token);
    if (!open) {
      appendText(token);
      continue;
    }

    const tag = open[1].toLowerCase();
    const element: HtmlNode & { type: 'element' } = {
      type: 'element',
      tag,
      attrs: parseAttrs(open[2] ?? ''),
      children: [],
      raw: token,
    };
    current().children.push(element);

    if (!isVoidTag(tag) && !/\/>$/.test(token)) {
      stack.push({ node: element, start: match.index });
    } else {
      element.raw = html.slice(match.index, tokenPattern.lastIndex);
    }
  }

  appendText(html.slice(lastIndex));

  for (let index = 1; index < stack.length; index += 1) {
    const entry = stack[index];
    if (entry.node.type === 'element') {
      entry.node.raw = html.slice(entry.start);
    }
  }

  return root;

  /**
   * Returns the element currently receiving parsed children.
   */
  function current(): HtmlNode & { type: 'element' | 'root' } {
    return stack[stack.length - 1].node;
  }

  /**
   * Appends a text node when the source slice is non-empty.
   */
  function appendText(value: string): void {
    if (value) current().children.push({ type: 'text', value });
  }

  /**
   * Closes the closest matching open element.
   */
  function closeTag(tag: string, end: number): void {
    for (let index = stack.length - 1; index > 0; index -= 1) {
      const entry = stack[index];
      if (entry.node.type === 'element' && entry.node.tag === tag) {
        entry.node.raw = html.slice(entry.start, end);
        stack.length = index;
        return;
      }
    }
    appendText(html.slice(end - tag.length - 3, end));
  }
}

/**
 * Parses HTML attributes used by Markdown equivalents.
 */
function parseAttrs(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(input)) !== null) {
    attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

/**
 * Checks whether a tag has attributes that Markdown cannot carry.
 */
function hasUnsupportedAttrs(node: HtmlNode & { type: 'element' }): boolean {
  const names = Object.keys(node.attrs);
  if (names.length === 0) return false;

  if (node.tag === 'a') return names.some((name) => name !== 'href' && name !== 'title');
  if (node.tag === 'img') return names.some((name) => name !== 'src' && name !== 'alt' && name !== 'title');
  if (node.tag === 'ol') return names.some((name) => name !== 'start');
  if (node.tag === 'code' || node.tag === 'pre') {
    return names.some((name) => name !== 'class') || !/\blanguage-[A-Za-z0-9_-]+/.test(node.attrs.class ?? '');
  }
  if (/^h[1-6]$/.test(node.tag)) {
    return names.some((name) => {
      if (name !== 'id') return true;
      // id is supported only when it matches the auto-generated slug from the heading text
      return node.attrs.id !== slugifyText(textContent(node));
    });
  }

  return true;
}

/**
 * Converts heading text to a slug matching Nizel's default GitHub-style slug generation.
 */
function slugifyText(value: string): string {
  return value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Renders a sequence of parsed HTML children.
 */
function renderChildren(nodes: HtmlNode[], options: Required<NizelHtmlToMarkdownOptions>, depth: number): string {
  return nodes.map((node) => renderNode(node, options, depth)).join('');
}

/**
 * Renders one parsed HTML node to Markdown.
 */
function renderNode(node: HtmlNode, options: Required<NizelHtmlToMarkdownOptions>, depth: number): string {
  if (node.type === 'text') return collapseText(decodeEntities(node.value));
  if (node.type === 'comment') return options.unsupported === 'preserve' ? node.value : ' ';
  if (node.type === 'root') return renderChildren(node.children, options, depth);

  /**
   * Renders this element's children as inline Markdown.
   */
  const inline = () => normalizeInline(renderChildren(node.children, options, depth));
  /**
   * Renders this element's children as block Markdown.
   */
  const block = () => normalizeDocument(renderChildren(node.children, options, depth));

  if (options.unsupported === 'preserve' && hasUnsupportedAttrs(node)) {
    return blockTags.has(node.tag) ? blockWrap(node.raw) : node.raw;
  }
  if (/^h[1-6]$/.test(node.tag)) return blockWrap(`${'#'.repeat(Number(node.tag[1]))} ${inline()}`);
  if (node.tag === 'p') return blockWrap(normalizeParagraph(renderChildren(node.children, options, depth)));
  if (node.tag === 'br') return '  \n';
  if (node.tag === 'hr') return blockWrap('---');
  if (node.tag === 'strong' || node.tag === 'b') return inlineWrap('**', inline());
  if (node.tag === 'em' || node.tag === 'i') return inlineWrap('*', inline());
  if (node.tag === 'del' || node.tag === 's' || node.tag === 'strike') return inlineWrap('~~', inline());
  if (node.tag === 'code') return renderInlineCode(textContent(node));
  if (node.tag === 'pre') return blockWrap(renderCodeBlock(node));
  if (node.tag === 'a') return renderLink(node, inline());
  if (node.tag === 'img') return renderImage(node);
  if (node.tag === 'blockquote') return blockWrap(prefixLines(block(), '> '));
  if (node.tag === 'ul' || node.tag === 'ol') return blockWrap(renderList(node, options, depth));
  if (node.tag === 'li') return inline();
  if (node.tag === 'table') {
    if (options.unsupported === 'preserve' && tableHasUnsupportedStructure(node)) return blockWrap(node.raw);
    return blockWrap(renderTable(node, options));
  }
  if (node.tag === 'thead' || node.tag === 'tbody' || node.tag === 'tr' || node.tag === 'th' || node.tag === 'td') return inline();
  if (node.tag === 'div' || node.tag === 'section' || node.tag === 'article' || node.tag === 'main' || node.tag === 'header' || node.tag === 'footer' || node.tag === 'nav') return blockWrap(block());
  if (node.tag === 'span') return inline();

  if (passthroughInlineTags.has(node.tag) || blockTags.has(node.tag)) {
    return options.unsupported === 'preserve' ? node.raw : block();
  }

  return options.unsupported === 'preserve' ? node.raw : inline();
}

/**
 * Renders an anchor as Markdown link syntax.
 */
function renderLink(node: HtmlNode & { type: 'element' }, text: string): string {
  const href = node.attrs.href;
  if (!href) return text;
  const title = node.attrs.title ? ` "${escapeTitle(node.attrs.title)}"` : '';
  return `[${escapeLinkText(text)}](${escapeUrl(href)}${title})`;
}

/**
 * Renders an image as Markdown image syntax.
 */
function renderImage(node: HtmlNode & { type: 'element' }): string {
  const src = node.attrs.src;
  if (!src) return '';
  const alt = escapeLinkText(node.attrs.alt ?? '');
  const title = node.attrs.title ? ` "${escapeTitle(node.attrs.title)}"` : '';
  return `![${alt}](${escapeUrl(src)}${title})`;
}

/**
 * Renders inline code with a delimiter that cannot conflict with its content.
 */
function renderInlineCode(value: string): string {
  const ticks = longestRun(value, '`') + 1;
  const fence = '`'.repeat(Math.max(1, ticks));
  const padding = value.startsWith('`') || value.endsWith('`') ? ' ' : '';
  return `${fence}${padding}${value}${padding}${fence}`;
}

/**
 * Renders preformatted code with language metadata when available.
 */
function renderCodeBlock(node: HtmlNode & { type: 'element' }): string {
  const codeElement = node.children.find((child): child is HtmlNode & { type: 'element' } => child.type === 'element' && child.tag === 'code');
  const className = codeElement?.attrs.class ?? node.attrs.class ?? '';
  const lang = /\blanguage-([A-Za-z0-9_-]+)/.exec(className)?.[1] ?? '';
  const code = textContent(codeElement ?? node).replace(/\n$/, '');
  const fence = '`'.repeat(Math.max(3, longestRun(code, '`') + 1));
  return `${fence}${lang}\n${code}\n${fence}`;
}

/**
 * Renders ordered and unordered lists.
 */
function renderList(node: HtmlNode & { type: 'element' }, options: Required<NizelHtmlToMarkdownOptions>, depth: number): string {
  return node.children
    .filter((child): child is HtmlNode & { type: 'element' } => child.type === 'element' && child.tag === 'li')
    .map((item, index) => {
      const marker = node.tag === 'ol' ? `${Number(node.attrs.start ?? 1) + index}. ` : '- ';
      const body = normalizeListItemBody(renderChildren(item.children, options, depth + 1));
      return indentContinuation(`${marker}${body}`, marker.length);
    })
    .join('\n');
}

/**
 * Renders simple HTML tables as GFM table syntax.
 */
function renderTable(node: HtmlNode & { type: 'element' }, options: Required<NizelHtmlToMarkdownOptions>): string {
  const rows = collectRows(node)
    .map((row) => row.children.filter((cell): cell is HtmlNode & { type: 'element' } => cell.type === 'element' && (cell.tag === 'th' || cell.tag === 'td')))
    .filter((row) => row.length > 0);
  if (rows.length === 0) return '';

  const width = Math.max(...rows.map((row) => row.length));
  const values = rows.map((row) => Array.from({ length: width }, (_, index) => normalizeInline(renderChildren(row[index]?.children ?? [], options, 0))));
  const header = values[0];
  const separator = Array.from({ length: width }, () => '---');
  const body = values.slice(1);
  return [header, separator, ...body].map((row) => `| ${row.join(' | ')} |`).join('\n');
}

/**
 * Checks whether a table contains structure GFM tables cannot represent.
 */
function tableHasUnsupportedStructure(node: HtmlNode & { type: 'element' }): boolean {
  return collectRows(node).some((row) =>
    row.children.some((cell) =>
      cell.type === 'element' &&
      (cell.tag === 'th' || cell.tag === 'td') &&
      Object.keys(cell.attrs).length > 0,
    ),
  );
}

/**
 * Collects table rows from direct and grouped table children.
 */
function collectRows(node: HtmlNode & { type: 'element' }): Array<HtmlNode & { type: 'element' }> {
  const rows: Array<HtmlNode & { type: 'element' }> = [];
  for (const child of node.children) {
    if (child.type !== 'element') continue;
    if (child.tag === 'tr') rows.push(child);
    if (child.tag === 'thead' || child.tag === 'tbody' || child.tag === 'tfoot') rows.push(...collectRows(child));
  }
  return rows;
}

/**
 * Extracts decoded text from a parsed subtree.
 */
function textContent(node: HtmlNode): string {
  if (node.type === 'text') return decodeEntities(node.value);
  if ('children' in node) return node.children.map(textContent).join('');
  return '';
}

/**
 * Wraps inline content in a Markdown marker.
 */
function inlineWrap(marker: string, value: string): string {
  return value ? `${marker}${value}${marker}` : '';
}

/**
 * Separates block output from neighboring blocks.
 */
function blockWrap(value: string): string {
  const trimmed = value.trim();
  return trimmed ? `\n\n${trimmed}\n\n` : '';
}

/**
 * Collapses Markdown block spacing to a stable document shape.
 */
function normalizeDocument(value: string): string {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Collapses inline whitespace where Markdown has no hard line-break semantics.
 */
function normalizeInline(value: string): string {
  return value.replace(/[ \t\r\n]+/g, ' ').trim();
}

/**
 * Collapses paragraph whitespace while preserving Markdown hard breaks.
 */
function normalizeParagraph(value: string): string {
  return value
    .split('\n')
    .map((line) => normalizeInline(line))
    .join('\n')
    .replace(/ *  \n */g, '  \n')
    .trim();
}

/**
 * Normalizes list item content while keeping nested lists attached to the item.
 */
function normalizeListItemBody(value: string): string {
  return normalizeDocument(value).replace(/\n\n(?=(?:[-*+]|\d+[.)]) )/g, '\n');
}

/**
 * Collapses HTML text-node whitespace.
 */
function collapseText(value: string): string {
  return value.replace(/\s+/g, ' ');
}

/**
 * Prefixes each line for blockquote rendering.
 */
function prefixLines(value: string, prefix: string): string {
  return value.split('\n').map((line) => (line ? `${prefix}${line}` : prefix.trimEnd())).join('\n');
}

/**
 * Indents list-item continuation lines under the marker.
 */
function indentContinuation(value: string, size: number): string {
  const indent = ' '.repeat(size);
  return value.split('\n').map((line, index) => (index === 0 ? line : `${indent}${line}`)).join('\n');
}

/**
 * Checks whether an HTML tag cannot have children.
 */
function isVoidTag(tag: string): boolean {
  return /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag);
}

/**
 * Decodes the named and numeric entities needed for Markdown output.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/&([a-z]+);/gi, (entity, name: string) => namedEntities[name.toLowerCase()] ?? entity);
}

const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

/**
 * Escapes text inside Markdown link and image brackets.
 */
function escapeLinkText(value: string): string {
  return value.replace(/([\\\]])/g, '\\$1');
}

/**
 * Escapes a Markdown link title.
 */
function escapeTitle(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Escapes URL characters that would break Markdown link syntax.
 */
function escapeUrl(value: string): string {
  return value.replace(/\s/g, '%20').replace(/\)/g, '%29');
}

/**
 * Finds the longest contiguous run of a delimiter character.
 */
function longestRun(value: string, char: string): number {
  let longest = 0;
  let current = 0;
  for (const part of value) {
    if (part === char) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

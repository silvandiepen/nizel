export type MarkdownFormatOptions = {
  tables?: boolean;
  headingSpacing?: boolean;
  blankLines?: boolean;
  unorderedListMarker?: '-' | '*' | '+';
  nestedListIndent?: 2 | 4;
  renumberOrderedLists?: boolean;
  codeFenceMarker?: '```' | '~~~';
  horizontalRule?: '---' | '***' | '___';
  blockquoteSpacing?: boolean;
  htmlInlineTags?: boolean;
  imageShortcodes?: boolean;
  bbcode?: boolean;
};

type ProtectedLine = {
  text: string;
  protected: boolean;
  kind?: 'frontmatter' | 'code-fence' | 'code-content';
};

const defaultOptions: Required<MarkdownFormatOptions> = {
  tables: true,
  headingSpacing: true,
  blankLines: true,
  unorderedListMarker: '-',
  nestedListIndent: 2,
  renumberOrderedLists: true,
  codeFenceMarker: '```',
  horizontalRule: '---',
  blockquoteSpacing: true,
  htmlInlineTags: true,
  imageShortcodes: true,
  bbcode: true,
};

export function formatMarkdown(markdown: string, options: MarkdownFormatOptions = {}): string {
  const resolved = { ...defaultOptions, ...options };
  const normalizedInput = resolved.bbcode
    ? normalizeBbcodeBlocks(markdown.replace(/\r\n?/g, '\n'), resolved)
    : markdown.replace(/\r\n?/g, '\n');
  const hasTrailingNewline = normalizedInput.endsWith('\n');
  const lines = normalizedInput.split('\n');
  if (hasTrailingNewline) lines.pop();

  const protectedLines = markProtectedFrontmatter(lines);
  const blockFormatted = formatBlocks(protectedLines, resolved);
  const spaced = resolved.blankLines ? normalizeBlankLines(blockFormatted) : blockFormatted;
  const result = spaced.map((line) => line.text).join('\n');
  return hasTrailingNewline ? `${result}\n` : result;
}

export const markdownFormatter = {
  format: formatMarkdown,
};

function markProtectedFrontmatter(lines: string[]): ProtectedLine[] {
  const protectedLines: ProtectedLine[] = lines.map((text) => ({ text, protected: false }));
  if (lines.length < 2) return protectedLines;

  const opening = lines[0].trim();
  const isDelimited = opening === '---' || opening === '+++';
  if (!isDelimited) return protectedLines;

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === opening);
  if (closingIndex <= 0) return protectedLines;

  for (let index = 0; index <= closingIndex; index += 1) {
    protectedLines[index].protected = true;
    protectedLines[index].kind = 'frontmatter';
  }

  return protectedLines;
}

function formatBlocks(lines: ProtectedLine[], options: Required<MarkdownFormatOptions>): ProtectedLine[] {
  const formatted: ProtectedLine[] = [];
  const orderedCounters = new Map<number, number>();
  let index = 0;
  let isInFence = false;
  let fenceMarker: '```' | '~~~' = options.codeFenceMarker;

  while (index < lines.length) {
    const line = lines[index];
    if (line.protected) {
      formatted.push(line);
      index += 1;
      continue;
    }

    const fence = parseCodeFence(line.text);
    if (fence) {
      if (!isInFence) {
        isInFence = true;
        fenceMarker = options.codeFenceMarker;
        const language = fence.info.trim();
        formatted.push({ text: `${fence.indent}${fenceMarker}${language ? ` ${language}` : ''}`, protected: true, kind: 'code-fence' });
      } else {
        isInFence = false;
        formatted.push({ text: `${fence.indent}${fenceMarker}`, protected: true, kind: 'code-fence' });
      }
      index += 1;
      continue;
    }

    if (isInFence) {
      formatted.push({ text: line.text, protected: true, kind: 'code-content' });
      index += 1;
      continue;
    }

    if (options.tables) {
      const table = tableBlock(lines, index);
      if (table) {
        formatted.push(...formatTable(table.map((entry) => entry.text)).map((text) => ({ text, protected: false })));
        index += table.length;
        continue;
      }
    }

    const text = formatLine(line.text, options, orderedCounters);
    if (!isListLine(text)) clearDeeperOrderedCounters(orderedCounters, -1);
    formatted.push({ text, protected: false });
    index += 1;
  }

  return formatted;
}

function formatLine(
  line: string,
  options: Required<MarkdownFormatOptions>,
  orderedCounters: Map<number, number>,
): string {
  if (line.trim() === '') return '';

  const blockquote = parseBlockquote(line);
  if (blockquote && options.blockquoteSpacing) {
    return `${blockquote.marker} ${normalizeInlineSyntax(blockquote.text, options)}`.trimEnd();
  }

  const heading = parseHeading(line);
  if (heading && options.headingSpacing) {
    return `${heading.indent}${heading.marker} ${normalizeInlineSyntax(heading.text, options)}`;
  }

  if (isHorizontalRule(line)) return options.horizontalRule;

  const unordered = parseUnorderedListItem(line);
  if (unordered) {
    const indent = normalizedIndent(unordered.indent, options.nestedListIndent);
    clearDeeperOrderedCounters(orderedCounters, indent.length);
    return `${indent}${options.unorderedListMarker} ${normalizeInlineSyntax(unordered.text, options)}`;
  }

  const ordered = parseOrderedListItem(line);
  if (ordered) {
    const indent = normalizedIndent(ordered.indent, options.nestedListIndent);
    const marker = options.renumberOrderedLists ? nextOrderedMarker(orderedCounters, indent.length) : Number(ordered.number);
    return `${indent}${marker}. ${normalizeInlineSyntax(ordered.text, options)}`;
  }

  return normalizeInlineSyntax(line, options);
}

function normalizeInlineSyntax(line: string, options: Required<MarkdownFormatOptions>): string {
  return mapOutsideHtmlComments(line, (commentFreeSegment) =>
    mapOutsideCodeSpans(commentFreeSegment, (segment) => {
      let next = segment;
      if (options.htmlInlineTags) next = normalizeInlineHtml(next);
      if (options.bbcode) next = normalizeBbcode(next);
      if (options.imageShortcodes) next = normalizeImageShortcodes(next);
      return next;
    }),
  );
}

function normalizeBbcodeBlocks(markdown: string, options: Required<MarkdownFormatOptions>): string {
  return mapOutsideFencedMarkdown(markdown, (segment) =>
    segment
      .replace(/\[quote\]([\s\S]*?)\[\/quote\]/gi, (_, text: string) => quoteMarkdown(text))
      .replace(/\[quote=([^\]]+)\]([\s\S]*?)\[\/quote\]/gi, (_, author: string, text: string) => quoteMarkdown(`${author} wrote:\n${text}`))
      .replace(/\[code=([^\]]+)\]([\s\S]*?)\[\/code\]/gi, (_, language: string, code: string) => `${options.codeFenceMarker} ${language.trim()}\n${code.trim()}\n${options.codeFenceMarker}`)
      .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, code: string) => `${options.codeFenceMarker}\n${code.trim()}\n${options.codeFenceMarker}`),
  );
}

function mapOutsideFencedMarkdown(markdown: string, transform: (segment: string) => string): string {
  const lines = markdown.split('\n');
  const chunks: string[] = [];
  let pending: string[] = [];
  let fenced: string[] = [];
  let isInFence = false;

  const flushPending = () => {
    if (pending.length > 0) {
      chunks.push(transform(pending.join('\n')));
      pending = [];
    }
  };

  const flushFenced = () => {
    if (fenced.length > 0) {
      chunks.push(fenced.join('\n'));
      fenced = [];
    }
  };

  for (const line of lines) {
    if (parseCodeFence(line)) {
      if (!isInFence) {
        flushPending();
        isInFence = true;
      } else {
        isInFence = false;
      }
      fenced.push(line);
      if (!isInFence) flushFenced();
      continue;
    }

    if (isInFence) {
      fenced.push(line);
    } else {
      pending.push(line);
    }
  }

  flushPending();
  flushFenced();
  return chunks.join('\n');
}

function mapOutsideHtmlComments(line: string, transform: (segment: string) => string): string {
  return line
    .split(/(<!--[\s\S]*?-->)/g)
    .map((part) => part.startsWith('<!--') ? part : transform(part))
    .join('');
}

function normalizeInlineHtml(segment: string): string {
  return segment
    .replace(/<\/?strong\b[^>]*>/gi, '**')
    .replace(/<\/?b\b[^>]*>/gi, '**')
    .replace(/<\/?em\b[^>]*>/gi, '_')
    .replace(/<\/?i\b[^>]*>/gi, '_');
}

function normalizeBbcode(segment: string): string {
  let next = segment
    .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '**$1**')
    .replace(/\[strong\]([\s\S]*?)\[\/strong\]/gi, '**$1**')
    .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '_$1_')
    .replace(/\[em\]([\s\S]*?)\[\/em\]/gi, '_$1_')
    .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '~~$1~~')
    .replace(/\[strike\]([\s\S]*?)\[\/strike\]/gi, '~~$1~~')
    .replace(/\[del\]([\s\S]*?)\[\/del\]/gi, '~~$1~~')
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, '[$2]($1)')
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, '[$1]($1)')
    .replace(/\[email=([^\]]+)\]([\s\S]*?)\[\/email\]/gi, '[$2](mailto:$1)')
    .replace(/\[email\]([\s\S]*?)\[\/email\]/gi, '[$1](mailto:$1)')
    .replace(/\[img=([^\]]+)\]([\s\S]*?)\[\/img\]/gi, '![$2]($1)')
    .replace(/\[img\]([\s\S]*?)\[\/img\]/gi, '![Alt]($1)')
    .replace(/\[color=[^\]]+\]([\s\S]*?)\[\/color\]/gi, '$1')
    .replace(/\[size=[^\]]+\]([\s\S]*?)\[\/size\]/gi, '$1')
    .replace(/\[font=[^\]]+\]([\s\S]*?)\[\/font\]/gi, '$1')
    .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '$1')
    .replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '$1')
    .replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '$1')
    .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '$1');

  return next;
}

function normalizeImageShortcodes(segment: string): string {
  return segment.replace(/\[img=([^\]\s]+)\]/gi, '![Alt]($1)');
}

function quoteMarkdown(text: string): string {
  return text
    .trim()
    .split('\n')
    .map((line) => `> ${line.trim()}`)
    .join('\n');
}

function mapOutsideCodeSpans(line: string, transform: (segment: string) => string): string {
  const parts = line.split(/(`+)/);
  let isInCode = false;
  return parts.map((part) => {
    if (/^`+$/.test(part)) {
      if (part.length % 2 === 1) isInCode = !isInCode;
      return part;
    }
    return isInCode ? part : transform(part);
  }).join('');
}

function normalizeBlankLines(lines: ProtectedLine[]): ProtectedLine[] {
  const compacted = collapseBlankRuns(lines);
  const result: ProtectedLine[] = [];

  for (let index = 0; index < compacted.length; index += 1) {
    const line = compacted[index];
    const previous = result[result.length - 1];
    const next = compacted[index + 1];

    if (needsBlankBefore(line, previous)) result.push({ text: '', protected: false });
    result.push(line);
    if (needsBlankAfter(line, next)) result.push({ text: '', protected: false });
  }

  return trimExtraEdgeBlanks(collapseBlankRuns(result));
}

function collapseBlankRuns(lines: ProtectedLine[]): ProtectedLine[] {
  const result: ProtectedLine[] = [];
  let previousBlank = false;

  for (const line of lines) {
    const isBlank = line.text.trim() === '';
    if (isBlank && previousBlank) continue;
    result.push(isBlank ? { text: '', protected: false } : line);
    previousBlank = isBlank;
  }

  return result;
}

function trimExtraEdgeBlanks(lines: ProtectedLine[]): ProtectedLine[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].text === '') start += 1;
  while (end > start && lines[end - 1].text === '') end -= 1;
  return lines.slice(start, end);
}

function needsBlankBefore(line: ProtectedLine, previous?: ProtectedLine): boolean {
  if (!previous || previous.text === '' || line.text === '') return false;
  if (line.kind === 'frontmatter' || previous.kind === 'frontmatter') return false;
  if (line.kind === 'code-content' || previous.kind === 'code-content') return false;
  return isBlockStartLine(line) && !sameBlockKindLine(previous, line);
}

function needsBlankAfter(line: ProtectedLine, next?: ProtectedLine): boolean {
  if (!next || next.text === '' || line.text === '') return false;
  if (line.kind === 'frontmatter' || next.kind === 'frontmatter') return false;
  if (line.kind === 'code-content' || next.kind === 'code-content') return false;
  return isBlockStartLine(line) && !sameBlockKindLine(line, next);
}

function isBlockStartLine(line: ProtectedLine): boolean {
  return line.kind === 'code-fence' || isBlockStart(line.text);
}

function sameBlockKindLine(a: ProtectedLine, b: ProtectedLine): boolean {
  return blockKindLine(a) === blockKindLine(b);
}

function blockKindLine(line: ProtectedLine): string {
  if (line.kind === 'code-fence' || line.kind === 'code-content') return 'code';
  return blockKind(line.text);
}

function isBlockStart(line: string): boolean {
  return Boolean(parseHeading(line) || isListLine(line) || isPipeTableLine(line) || isHorizontalRule(line) || parseBlockquote(line));
}

function blockKind(line: string): string {
  if (parseHeading(line)) return 'heading';
  if (isListLine(line)) return 'list';
  if (isPipeTableLine(line)) return 'table';
  if (isHorizontalRule(line)) return 'rule';
  if (parseBlockquote(line)) return 'blockquote';
  return 'paragraph';
}

function parseHeading(line: string): { indent: string; marker: string; text: string } | null {
  const match = line.match(/^(\s{0,3})(#{1,6})(?!#)\s*(.+?)\s*$/);
  if (!match) return null;
  return { indent: match[1], marker: match[2], text: match[3] };
}

function parseBlockquote(line: string): { marker: string; text: string } | null {
  const match = line.match(/^(\s*>+)\s?(.*)$/);
  if (!match) return null;
  return { marker: match[1], text: match[2] };
}

function parseUnorderedListItem(line: string): { indent: string; text: string } | null {
  const match = line.match(/^(\s*)([-+*])\s+(.*)$/);
  if (!match) return null;
  return { indent: match[1], text: match[3] };
}

function parseOrderedListItem(line: string): { indent: string; number: string; text: string } | null {
  const match = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
  if (!match) return null;
  return { indent: match[1], number: match[2], text: match[3] };
}

function parseCodeFence(line: string): { indent: string; marker: string; info: string } | null {
  const match = line.match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/);
  if (!match) return null;
  return { indent: match[1], marker: match[2], info: match[3] };
}

function isHorizontalRule(line: string): boolean {
  return /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line);
}

function isListLine(line: string): boolean {
  return parseUnorderedListItem(line) !== null || parseOrderedListItem(line) !== null;
}

function normalizedIndent(indent: string, size: 2 | 4): string {
  const width = Array.from(indent).reduce((total, character) => total + (character === '\t' ? size : 1), 0);
  const level = Math.max(0, Math.round(width / size));
  return ' '.repeat(level * size);
}

function nextOrderedMarker(counters: Map<number, number>, indentWidth: number): number {
  const next = (counters.get(indentWidth) ?? 0) + 1;
  counters.set(indentWidth, next);
  clearDeeperOrderedCounters(counters, indentWidth);
  return next;
}

function clearDeeperOrderedCounters(counters: Map<number, number>, indentWidth: number): void {
  for (const key of counters.keys()) {
    if (key > indentWidth) counters.delete(key);
  }
}

function tableBlock(lines: ProtectedLine[], start: number): ProtectedLine[] | null {
  if (start + 1 >= lines.length) return null;
  if (lines[start].protected || lines[start + 1].protected) return null;
  if (!isPipeTableLine(lines[start].text)) return null;
  if (!isPipeTableLine(lines[start + 1].text)) return null;
  if (!isSeparatorRow(lines[start + 1].text)) return null;

  let end = start + 2;
  while (end < lines.length && !lines[end].protected && isPipeTableLine(lines[end].text)) end += 1;

  const block = lines.slice(start, end);
  const columnCount = Math.max(...block.map((line) => splitPipeRow(line.text).length));
  return columnCount > 1 ? block : null;
}

function formatTable(tableLines: string[]): string[] {
  const rows = tableLines.map(splitPipeRow);
  const columnCount = Math.max(...rows.map((row) => row.length));
  if (columnCount <= 1) return tableLines;

  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array(Math.max(0, columnCount - row.length)).fill(''),
  ]);
  const alignments = separatorAlignments(normalizedRows[1]);
  const widths = Array.from({ length: columnCount }, (_, column) => {
    const contentWidths = normalizedRows
      .filter((_, index) => index !== 1)
      .map((row) => displayWidth(row[column]));
    return Math.max(3, ...contentWidths);
  });

  return normalizedRows.map((row, index) => {
    if (index === 1) return formatSeparatorRow(widths, alignments);
    return formatContentRow(row, widths);
  });
}

function isPipeTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && splitPipeRow(line).length > 1;
}

function isSeparatorRow(line: string): boolean {
  const cells = splitPipeRow(line);
  if (cells.length <= 1) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitPipeRow(line: string): string[] {
  let text = line.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let isInCodeSpan = false;
  let isEscaped = false;

  for (const character of text) {
    if (isEscaped) {
      current += character;
      isEscaped = false;
      continue;
    }
    if (character === '\\') {
      current += character;
      isEscaped = true;
      continue;
    }
    if (character === '`') {
      isInCodeSpan = !isInCodeSpan;
      current += character;
      continue;
    }
    if (character === '|' && !isInCodeSpan) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function separatorAlignments(row: string[]): TableColumnAlignment[] {
  return row.map((cell) => {
    const trimmed = cell.trim();
    if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
    if (trimmed.startsWith(':')) return 'left';
    if (trimmed.endsWith(':')) return 'right';
    return 'none';
  });
}

function formatContentRow(row: string[], widths: number[]): string {
  const cells = row.map((cell, column) => `${cell}${' '.repeat(Math.max(0, widths[column] - displayWidth(cell)))}`);
  return `| ${cells.join(' | ')} |`;
}

function formatSeparatorRow(widths: number[], alignments: TableColumnAlignment[]): string {
  const cells = widths.map((width, column) => {
    const alignment = alignments[column] ?? 'none';
    if (alignment === 'left') return `:${'-'.repeat(Math.max(2, width - 1))}`;
    if (alignment === 'right') return `${'-'.repeat(Math.max(2, width - 1))}:`;
    if (alignment === 'center') return `:${'-'.repeat(Math.max(1, width - 2))}:`;
    return '-'.repeat(width);
  });
  return `| ${cells.join(' | ')} |`;
}

function displayWidth(value: string): number {
  return Array.from(value).length;
}

type TableColumnAlignment = 'none' | 'left' | 'right' | 'center';

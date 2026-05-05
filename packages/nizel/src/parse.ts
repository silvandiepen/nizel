import type {
  NizelAutolinkOptions,
  NizelBlockMap,
  NizelBlockNode,
  NizelHeadingNode,
  NizelListItemNode,
  NizelRootNode,
} from './types.js';
import { slugify, uniqueSlug } from './utils.js';
import {
  isRawHtmlBlockLine,
  isSetextUnderline,
  isThematicBreak,
  normalizeParagraphLine,
  normalizeParagraphSource,
  trimClosingHeadingHashes,
} from './parse/block.js';
import {
  canContinueBlockquoteLazily,
  canStartLazyBlockquoteContinuation,
} from './parse/blockquote.js';
import { parseCodeMeta, parseFenceInfo, stripFenceIndent } from './parse/code.js';
import { readCustomBlock, splitWords } from './parse/custom.js';
import { isInterruptingHtmlBlockStart, readHtmlBlock } from './parse/html.js';
import {
  parseInline,
  parseInlineWithState,
  stripInlineMarkdown,
  type InlineParseState,
} from './parse/inline.js';
import { stripInlineNodes } from './parse/inline-text.js';
import {
  isParagraphInterruptingListMarker,
  isSameListMarker,
  parseListMarker,
} from './parse/list.js';
import { parseListItemBlocks } from './parse/list-items.js';
import {
  expandLeadingTabs,
  expandLeadingTabsFromColumn,
  trimTrailingBlankLines,
} from './parse/lines.js';
import { extractReferenceDefinitions } from './parse/references.js';
import { isTableStart, readTable } from './parse/table.js';

export { parseInline, stripInlineMarkdown } from './parse/inline.js';

/**
 * Pre-compiled regex patterns for block parsing.
 */
const CARRIAGE_RETURN = /\r\n?/g;
const REFERENCE_DEF_START = /(^|\n)(?: {0,3}> ?| {0,3})\[/;
const CUSTOM_BLOCK = /^::([A-Za-z][\w-]*)(?:\s+(.*))?$/;
const FENCE_OPENING = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*$/;
const QUOTE_MARKER = /^( {0,3}> ?)(.*)$/;
const INDENTED_CODE = /^ {4}/;

// Paragraph continuation interrupt patterns
const ATX_HEADING_START = /^(#{1,6})\s+/;
const FENCE_START = /^ {0,3}(`{3,}|~{3,})/;
const CUSTOM_BLOCK_START = /^::[A-Za-z][\w-]*/;
const BLOCKQUOTE_START = /^ {0,3}> ?/;

// Block start patterns
const ATX_HEADING_BLOCK = /^ {0,3}(#{1,6})(?:\s|$)/;
const FENCE_BLOCK = /^ {0,3}(`{3,}|~{3,})/;

export type ParseOptions = {
  anchors: boolean;
  autolinks: boolean | NizelAutolinkOptions | undefined;
  blocks: NizelBlockMap;
  safe: boolean;
  slugStyle?: 'github' | 'classic';
};

type ParseState = InlineParseState;

/**
 * Parses Markdown into Nizel's normalized root AST.
 */
export function parseMarkdown(markdown: string, options: ParseOptions): NizelRootNode {
  const normalizedMarkdown = markdown.includes('\r')
    ? markdown.replace(CARRIAGE_RETURN, '\n')
    : markdown;
  const lines = expandLeadingTabs(normalizedMarkdown).split('\n');
  const { contentLines, references } = REFERENCE_DEF_START.test(normalizedMarkdown)
    ? extractReferenceDefinitions(lines)
    : { contentLines: lines, references: new Map() };
  const children = parseBlocks(contentLines, options, new Map<string, number>(), { references });
  return { type: 'root', children };
}

/**
 * Parses block-level Markdown constructs from a list of normalized lines.
 */
function parseBlocks(
  lines: string[],
  options: ParseOptions,
  seenSlugs: Map<string, number>,
  state: ParseState,
): NizelBlockNode[] {
  const children: NizelBlockNode[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;

    if (!options.safe) {
      const htmlBlock = readHtmlBlock(lines, index);
      if (htmlBlock) {
        children.push({ type: 'html', value: htmlBlock.value });
        index = htmlBlock.endIndex;
        continue;
      }
    }

    const customBlock = CUSTOM_BLOCK.exec(line.trim());
    if (customBlock) {
      const parsed = readCustomBlock(lines, index);
      const args = splitWords(customBlock[2] ?? '');
      const definition = options.blocks[customBlock[1]];
      const value = definition?.parse?.({
        name: customBlock[1],
        args,
        props: parsed.props,
        content: parsed.content,
      });
      children.push({
        type: 'customBlock',
        name: customBlock[1],
        args,
        props: parsed.props,
        value,
        children: parseBlocks(parsed.content.split('\n'), options, seenSlugs, state),
      });
      index = parsed.endIndex;
      continue;
    }

    const fence = FENCE_OPENING.exec(line);
    if (fence) {
      const code: string[] = [];
      const indent = fence[1].length;
      const markerRun = fence[2];
      const marker = markerRun[0];
      const close = new RegExp(`^ {0,3}\\${marker}{${markerRun.length},}\\s*$`);
      const info = parseFenceInfo(fence[3] ?? '', marker);
      if (!info.valid) {
        // Invalid backtick info strings fall through to paragraph parsing.
      } else {
        index += 1;
        while (index < lines.length && !close.test(lines[index])) {
          code.push(stripFenceIndent(lines[index], indent));
          index += 1;
        }
        if (index >= lines.length && code[code.length - 1] === '') code.pop();

        const metadata = parseCodeMeta(info.meta);
        children.push({
          type: 'code',
          code: code.length > 0 ? `${code.join('\n')}\n` : '',
          lang: info.lang,
          meta: info.meta || undefined,
          filename: metadata.filename,
          highlightLines: metadata.highlightLines,
        });
        continue;
      }
    }

    if (INDENTED_CODE.test(line)) {
      const code: string[] = [];
      while (index < lines.length && (INDENTED_CODE.test(lines[index]) || !lines[index].trim())) {
        code.push(lines[index].replace(/^ {0,4}/, ''));
        index += 1;
      }
      index -= 1;
      const trimmedCode = trimTrailingBlankLines(code);
      children.push({ type: 'code', code: trimmedCode.length > 0 ? `${trimmedCode.join('\n')}\n` : '' });
      continue;
    }

    if (isThematicBreak(line)) {
      children.push({ type: 'thematicBreak' });
      continue;
    }

    const heading = ATX_HEADING.exec(line);
    if (heading) {
      const source = trimClosingHeadingHashes(heading[2] ?? '');
      const inlineChildren = parseInlineWithState(source, options, state);
      const text = stripInlineNodes(inlineChildren);
      const node: NizelHeadingNode = {
        type: 'heading',
        depth: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text,
        children: inlineChildren,
      };
      if (options.anchors && text) node.id = uniqueSlug(slugify(text, options.slugStyle), seenSlugs);
      children.push(node);
      continue;
    }

    const setext = lines[index + 1] && isSetextUnderline(lines[index + 1]);
    if (setext && line.trim() && !isBlockStart(line, options, lines, index)) {
      const source = line.trim();
      const inlineChildren = parseInlineWithState(source, options, state);
      const text = stripInlineNodes(inlineChildren);
      const node: NizelHeadingNode = {
        type: 'heading',
        depth: setext[1][0] === '=' ? 1 : 2,
        text,
        children: inlineChildren,
      };
      if (options.anchors && text) node.id = uniqueSlug(slugify(text, options.slugStyle), seenSlugs);
      children.push(node);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const parsed = readTable(lines, index, options, parseInline);
      children.push(parsed.table);
      index = parsed.endIndex;
      continue;
    }

    if (BLOCKQUOTE_START.test(line)) {
      const quoteLines: string[] = [];
      let allowLazyContinuation = false;
      while (index < lines.length) {
        const quoteMarker = QUOTE_MARKER.exec(lines[index]);
        if (quoteMarker) {
          const markerColumn = quoteMarker[1].endsWith(' ') ? quoteMarker[1].length : quoteMarker[1].length + 1;
          const quoteLine = expandLeadingTabsFromColumn(quoteMarker[2], markerColumn);
          quoteLines.push(quoteLine);
          allowLazyContinuation = canStartLazyBlockquoteContinuation<ParseOptions>(
            quoteLine,
            options,
            quoteLines,
            quoteLines.length - 1,
            isBlockStart,
          );
          index += 1;
          continue;
        }

        if (
          allowLazyContinuation &&
          canContinueBlockquoteLazily(lines[index], options, lines, index)
        ) {
          quoteLines.push(isSetextUnderline(lines[index]) ? `\\${lines[index]}` : lines[index]);
          allowLazyContinuation = true;
          index += 1;
          continue;
        }

        break;
      }
      if (quoteLines[quoteLines.length - 1] === '') {
        quoteLines.pop();
      }
      if (index > 0) {
        index -= 1;
      } else {
        index += 1;
      }
      children.push({
        type: 'blockquote',
        children: parseBlocks(quoteLines, options, seenSlugs, state),
      });
      continue;
    }

    const openingListMarker = parseListMarker(line);
    if (openingListMarker) {
      const items: NizelListItemNode[] = [];
      const ordered = openingListMarker.ordered;
      const start = openingListMarker.start;
      let tight = true;

      while (index < lines.length) {
        if (items.length > 0 && isThematicBreak(lines[index])) break;

        const marker = parseListMarker(lines[index]);
        if (!marker || marker.ordered !== ordered || !isSameListMarker(openingListMarker, marker)) {
          break;
        }
        const body = marker.body;
        const checked = /^\[[ xX]\]\s+/.test(body)
          ? /^\[[xX]\]\s+/.test(body)
          : undefined;
        const cleanBody = body.replace(/^\[[ xX]\]\s+/, '');
        const parsedItem = parseListItemBlocks(
          cleanBody,
          lines,
          index,
          openingListMarker,
          marker.contentIndent,
          options,
          seenSlugs,
          state,
          parseBlocks,
          isBlockStart,
        );
        if (parsedItem.loose) tight = false;
        items.push({
          type: 'listItem',
          checked,
          children: parsedItem.children,
        });
        index = parsedItem.endIndex + 1;
      }
      index -= 1;

      children.push({ type: 'list', ordered, start, tight, children: items });
      continue;
    }

    const paragraph: string[] = [normalizeParagraphLine(line)];
    while (
      index + 1 < lines.length &&
      canContinueParagraph(lines[index + 1], lines, index + 1, options)
    ) {
      index += 1;
      paragraph.push(normalizeParagraphLine(lines[index]));
    }

    const paragraphSetext = lines[index + 1] && isSetextUnderline(lines[index + 1]);
    if (paragraphSetext) {
      const source = normalizeParagraphSource(paragraph);
      const inlineChildren = parseInlineWithState(source, options, state);
      const text = stripInlineNodes(inlineChildren);
      const node: NizelHeadingNode = {
        type: 'heading',
        depth: paragraphSetext[1][0] === '=' ? 1 : 2,
        text,
        children: inlineChildren,
      };
      if (options.anchors && text) node.id = uniqueSlug(slugify(text, options.slugStyle), seenSlugs);
      children.push(node);
      index += 1;
      continue;
    }

    children.push({
      type: 'paragraph',
      children: parseInlineWithState(normalizeParagraphSource(paragraph), options, state),
    });
  }

  return children;
}

/**
 * Checks whether a line can continue the current paragraph.
 */
function canContinueParagraph(
  line: string,
  lines: string[],
  index: number,
  options: ParseOptions,
): boolean {
  if (!line.trim()) return false;
  if (!hasParagraphInterruptCandidate(line, options)) return true;

  return Boolean(
    !isSetextUnderline(line) &&
      !isThematicBreak(line) &&
      !ATX_HEADING_START.test(line) &&
      !FENCE_START.test(line) &&
      !CUSTOM_BLOCK_START.test(line.trim()) &&
      !isParagraphInterruptingListMarker(line) &&
      !BLOCKQUOTE_START.test(line) &&
      !(options.safe === false && isInterruptingHtmlBlockStart(line)) &&
      !isTableStart(lines, index),
  );
}

/**
 * Checks whether a paragraph continuation line needs full interrupt tests.
 */
function hasParagraphInterruptCandidate(line: string, options: ParseOptions): boolean {
  const trimmedStart = line.trimStart();
  const first = trimmedStart[0];
  if (line.includes('|')) return true;
  if (options.safe === false && first === '<') return true;
  return first !== undefined && '#`~:->*+=0123456789'.includes(first);
}

/**
 * Tests whether a line starts a non-paragraph block construct.
 */
function isBlockStart(line: string, options: ParseOptions, lines: string[], index: number): boolean {
  return Boolean(
      ATX_HEADING_BLOCK.test(line) ||
      FENCE_BLOCK.test(line) ||
      isThematicBreak(line) ||
      BLOCKQUOTE_START.test(line) ||
      parseListMarker(line) ||
      isTableStart(lines, index) ||
      (!options.safe && isRawHtmlBlockLine(line)),
  );
}

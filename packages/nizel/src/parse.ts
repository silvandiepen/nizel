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
  const lines = expandLeadingTabs(markdown.replace(/\r\n/g, '\n')).split('\n');
  const { contentLines, references } = extractReferenceDefinitions(lines);
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

    const customBlock = /^::([A-Za-z][\w-]*)(?:\s+(.*))?$/.exec(line.trim());
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

    const fence = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
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

    if (/^ {4}/.test(line)) {
      const code: string[] = [];
      while (index < lines.length && (/^ {4}/.test(lines[index]) || !lines[index].trim())) {
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

    const heading = /^ {0,3}(#{1,6})(?:\s+(.*?))?\s*$/.exec(line);
    if (heading) {
      const source = trimClosingHeadingHashes(heading[2] ?? '');
      const text = stripInlineMarkdown(source, options);
      const node: NizelHeadingNode = {
        type: 'heading',
        depth: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text,
        children: parseInlineWithState(source, options, state),
      };
      if (options.anchors && text) node.id = uniqueSlug(slugify(text, options.slugStyle), seenSlugs);
      children.push(node);
      continue;
    }

    const setext = lines[index + 1] && isSetextUnderline(lines[index + 1]);
    if (setext && line.trim() && !isBlockStart(line, options, lines, index)) {
      const source = line.trim();
      const text = stripInlineMarkdown(source, options);
      const node: NizelHeadingNode = {
        type: 'heading',
        depth: setext[1][0] === '=' ? 1 : 2,
        text,
        children: parseInlineWithState(source, options, state),
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

    if (/^ {0,3}> ?/.test(line)) {
      const quoteLines: string[] = [];
      let allowLazyContinuation = false;
      while (index < lines.length) {
        const quoteMarker = /^( {0,3}> ?)(.*)$/.exec(lines[index]);
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
      lines[index + 1].trim() &&
      !isSetextUnderline(lines[index + 1]) &&
      !isThematicBreak(lines[index + 1]) &&
      !/^(#{1,6})\s+/.test(lines[index + 1]) &&
      !/^ {0,3}(`{3,}|~{3,})/.test(lines[index + 1]) &&
      !/^::[A-Za-z][\w-]*/.test(lines[index + 1].trim()) &&
      !isParagraphInterruptingListMarker(lines[index + 1]) &&
      !/^ {0,3}> ?/.test(lines[index + 1]) &&
      !(options.safe === false && isInterruptingHtmlBlockStart(lines[index + 1])) &&
      !isTableStart(lines, index + 1)
    ) {
      index += 1;
      paragraph.push(normalizeParagraphLine(lines[index]));
    }

    const paragraphSetext = lines[index + 1] && isSetextUnderline(lines[index + 1]);
    if (paragraphSetext) {
      const source = normalizeParagraphSource(paragraph);
      const text = stripInlineMarkdown(source, options);
      const node: NizelHeadingNode = {
        type: 'heading',
        depth: paragraphSetext[1][0] === '=' ? 1 : 2,
        text,
        children: parseInlineWithState(source, options, state),
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
 * Tests whether a line starts a non-paragraph block construct.
 */
function isBlockStart(line: string, options: ParseOptions, lines: string[], index: number): boolean {
  return Boolean(
      /^ {0,3}(#{1,6})(?:\s|$)/.test(line) ||
      /^ {0,3}(`{3,}|~{3,})/.test(line) ||
      isThematicBreak(line) ||
      /^ {0,3}> ?/.test(line) ||
      parseListMarker(line) ||
      isTableStart(lines, index) ||
      (!options.safe && isRawHtmlBlockLine(line)),
  );
}

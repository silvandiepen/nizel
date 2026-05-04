import type { NizelBlockNode } from '../types.js';
import { openingFenceClosePattern } from './code.js';
import { countLeadingSpaces, nextNonBlankLine } from './lines.js';
import { isSameListMarker, parseListMarker, type ListMarker } from './list.js';

export type ParseBlocksForListItem<TOptions, TState> = (
  lines: string[],
  options: TOptions,
  seenSlugs: Map<string, number>,
  state: TState,
) => NizelBlockNode[];

export type IsBlockStartForListItem<TOptions> = (
  line: string,
  options: TOptions,
  lines: string[],
  index: number,
) => boolean;

/**
 * Parses continuation lines for a list item into nested block content.
 */
export const parseListItemBlocks = <TOptions, TState>(
  firstLine: string,
  lines: string[],
  index: number,
  openingListMarker: ListMarker,
  contentIndent: number,
  options: TOptions,
  seenSlugs: Map<string, number>,
  state: TState,
  parseBlocks: ParseBlocksForListItem<TOptions, TState>,
  isBlockStart: IsBlockStartForListItem<TOptions>,
): { children: NizelBlockNode[]; endIndex: number; loose: boolean } => {
  const itemLines = [firstLine];
  let cursor = index + 1;
  let loose = false;
  let sawBlank = false;
  let openFence = openingFenceClosePattern(firstLine);

  while (cursor < lines.length) {
    const marker = parseListMarker(lines[cursor]);
    if (
      marker &&
      marker.ordered === openingListMarker.ordered &&
      isSameListMarker(openingListMarker, marker) &&
      countLeadingSpaces(lines[cursor]) < contentIndent
    ) {
      break;
    }

    if (!lines[cursor].trim()) {
      if (openFence) {
        itemLines.push('');
        cursor += 1;
        continue;
      }

      const nextContentIndex = nextNonBlankLine(lines, cursor + 1);
      if (nextContentIndex === -1) break;

      const nextMarker = parseListMarker(lines[nextContentIndex]);
      if (
        nextMarker &&
        nextMarker.ordered === openingListMarker.ordered &&
        isSameListMarker(openingListMarker, nextMarker) &&
        countLeadingSpaces(lines[nextContentIndex]) < contentIndent
      ) {
        itemLines.push('');
        loose = true;
        sawBlank = true;
        cursor += 1;
        continue;
      }

      if (cursor === index + 1 && firstLine === '') break;
      const nextIndent = countLeadingSpaces(lines[nextContentIndex]);
      if (nextIndent < contentIndent) break;
      itemLines.push('');
      loose = !hasNestedListMarkerBeforeBlank(itemLines, nextIndent - contentIndent);
      sawBlank = true;
      cursor += 1;
      continue;
    }

    if (countLeadingSpaces(lines[cursor]) >= contentIndent) {
      const itemLine = lines[cursor].slice(contentIndent);
      itemLines.push(itemLine);
      openFence = updateOpenFence(openFence, itemLine);
      cursor += 1;
      continue;
    }

    if (!sawBlank && !isBlockStart(lines[cursor], options, lines, cursor)) {
      itemLines.push(lines[cursor]);
      openFence = updateOpenFence(openFence, lines[cursor]);
      cursor += 1;
      continue;
    }

    break;
  }

  while (itemLines.length > 0 && itemLines[itemLines.length - 1] === '') {
    itemLines.pop();
  }

  return {
    children: parseBlocks(itemLines, options, seenSlugs, state),
    endIndex: cursor - 1,
    loose,
  };
};

/**
 * Checks whether a blank line belongs to a nested list rather than this item.
 */
export const hasNestedListMarkerBeforeBlank = (itemLines: string[], relativeNextIndent: number): boolean => {
  return itemLines.some((itemLine) => {
    const marker = parseListMarker(itemLine);
    return marker !== null && countLeadingSpaces(itemLine) < relativeNextIndent;
  });
};

/**
 * Updates the current fenced-code state after reading a list item line.
 */
export const updateOpenFence = (openFence: RegExp | null, line: string): RegExp | null => {
  if (openFence) return openFence.test(line) ? null : openFence;
  return openingFenceClosePattern(line);
};

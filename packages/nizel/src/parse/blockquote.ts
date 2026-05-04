import { isThematicBreak } from './block.js';
import { isInterruptingHtmlBlockStart } from './html.js';
import { parseListMarker } from './list.js';
import { isTableStart } from './table.js';

export type BlockquoteContinuationOptions = {
  safe: boolean;
};

/**
 * Checks whether an unmarked line lazily continues a blockquote paragraph.
 */
export const canContinueBlockquoteLazily = (
  line: string,
  options: BlockquoteContinuationOptions,
  lines: string[],
  index: number,
): boolean => {
  return Boolean(
      line.trim() &&
      !/^ {0,3}> ?/.test(line) &&
      !/^ {0,3}(`{3,}|~{3,})/.test(line) &&
      !isThematicBreak(line) &&
      !parseListMarker(line) &&
      !isTableStart(lines, index) &&
      !(options.safe === false && isInterruptingHtmlBlockStart(line)),
  );
};

/**
 * Checks whether the current quoted line can be followed by lazy continuation.
 */
export const canStartLazyBlockquoteContinuation = <TOptions extends BlockquoteContinuationOptions>(
  line: string,
  options: TOptions,
  lines: string[],
  index: number,
  isBlockStart: (
    line: string,
    options: TOptions,
    lines: string[],
    index: number,
  ) => boolean,
): boolean => {
  const candidate = lazyContinuationCandidate(line);
  return Boolean(
    candidate.trim() &&
      !/^ {0,3}(`{3,}|~{3,})/.test(candidate) &&
      !/^ {4}/.test(candidate) &&
      !isBlockStart(candidate, options, lines, index),
  );
};

/**
 * Finds the deepest paragraph-like content that can receive lazy continuation.
 */
export const lazyContinuationCandidate = (line: string): string => {
  let candidate = line;

  while (true) {
    const quoteMarker = /^ {0,3}> ?(.*)$/.exec(candidate);
    if (quoteMarker) {
      candidate = quoteMarker[1];
      continue;
    }

    const marker = parseListMarker(candidate);
    if (marker && /^ {0,3}> ?/.test(marker.body)) {
      candidate = marker.body;
      continue;
    }

    return candidate;
  }
};

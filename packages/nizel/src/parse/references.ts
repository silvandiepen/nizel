import {
  decodeStringContent,
  normalizeHref,
  normalizeReference,
  type ReferenceDefinition,
} from './common.js';
import { readHtmlBlock } from './html.js';

/**
 * Pre-compiled regex patterns for reference definition extraction.
 */
const FENCE_OPENING = /^ {0,3}(`{3,}|~{3,})/;
const INDENTED_CODE = /^ {4}/;
const BLOCKQUOTE_LINE = /^>\s?(.*)$/;
const REF_DEF_OPENER = /^ {0,3}\[((?:\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]|[^\[\]\n]){1,999})\]:[ \t]*(.*)$/;
const MULTILINE_REF_OPENER = /^ {0,3}\[((?:\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]|[^\[\]\n])*)$/;
const MULTILINE_REF_CLOSER = /^ {0,3}((?:\\[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]|[^\[\]\n])*)\]:[ \t]*(.*)$/;
const LINE_INDENT = /^ {1,}/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:\s|$)/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const DESTINATION_MATCH = /^\S+/;

/**
 * Extracts link reference definitions before block parsing.
 */
export const extractReferenceDefinitions = (lines: string[]): {
  contentLines: string[];
  references: Map<string, ReferenceDefinition>;
} => {
  const references = new Map<string, ReferenceDefinition>();
  const contentLines: string[] = [];
  let previousWasReference = false;

  for (let index = 0; index < lines.length; index += 1) {
    const htmlBlock = readHtmlBlock(lines, index);
    if (htmlBlock) {
      contentLines.push(...lines.slice(index, htmlBlock.endIndex + 1));
      index = htmlBlock.endIndex;
      previousWasReference = false;
      continue;
    }

    const fence = FENCE_OPENING.exec(lines[index]);
    if (fence) {
      const marker = fence[1][0];
      const close = new RegExp(`^ {0,3}\\${marker}{${fence[1].length},}\\s*$`);
      contentLines.push(lines[index]);
      index += 1;
      while (index < lines.length) {
        contentLines.push(lines[index]);
        if (close.test(lines[index])) break;
        index += 1;
      }
      previousWasReference = false;
      continue;
    }

    if (INDENTED_CODE.test(lines[index])) {
      contentLines.push(lines[index]);
      previousWasReference = false;
      continue;
    }

    const blockquoteReference = BLOCKQUOTE_LINE.exec(lines[index]);
    if (blockquoteReference) {
      const parsed = readReferenceDefinition([blockquoteReference[1]], 0);
      if (parsed) {
        const label = normalizeReference(parsed.label);
        if (!references.has(label)) references.set(label, parsed.reference);
        contentLines.push('>');
        previousWasReference = true;
        continue;
      }
    }

    const canStartReference =
      index === 0 ||
      !lines[index - 1].trim() ||
      previousWasReference ||
      isReferenceStartAfterBlock(lines[index - 1]);
    if (!canStartReference) {
      contentLines.push(lines[index]);
      previousWasReference = false;
      continue;
    }

    const parsed = readReferenceDefinition(lines, index);
    if (!parsed) {
      contentLines.push(lines[index]);
      previousWasReference = false;
      continue;
    }

    const label = normalizeReference(parsed.label);
    if (!references.has(label)) references.set(label, parsed.reference);
    index = parsed.endIndex;
    previousWasReference = true;
  }

  return { contentLines, references };
};

/**
 * Reads a CommonMark link reference definition starting at a line.
 */
export const readReferenceDefinition = (
  lines: string[],
  startIndex: number,
): { label: string; reference: ReferenceDefinition; endIndex: number } | null => {
  const multiline = readMultilineReferenceDefinition(lines, startIndex);
  if (multiline) return multiline;

  const opener = REF_DEF_OPENER.exec(lines[startIndex]);
  if (!opener) return null;

  const parts = [opener[2]];
  let cursor = startIndex + 1;
  while (
    cursor < lines.length &&
    lines[cursor].trim() &&
    canContinueReferenceDefinition(parts, lines[cursor])
  ) {
    parts.push(lines[cursor]);
    cursor += 1;
  }

  const reference = parseReferenceDefinitionContent(parts.join('\n'));
  if (!reference) return null;

  return {
    label: decodeStringContent(opener[1]),
    reference,
    endIndex: cursor - 1,
  };
};

/**
 * Reads a link reference definition whose label spans multiple lines.
 */
export const readMultilineReferenceDefinition = (
  lines: string[],
  startIndex: number,
): { label: string; reference: ReferenceDefinition; endIndex: number } | null => {
  const opener = MULTILINE_REF_OPENER.exec(lines[startIndex]);
  if (!opener) return null;

  const labelParts = [opener[1]];
  for (let cursor = startIndex + 1; cursor < lines.length; cursor += 1) {
    const closer = MULTILINE_REF_CLOSER.exec(lines[cursor]);
    if (!closer) {
      if (!lines[cursor].trim()) return null;
      labelParts.push(lines[cursor]);
      continue;
    }

    const label = labelParts.concat(closer[1]).join('\n');
    if (!label.trim() || label.length > 999) return null;

    const parts = [closer[2]];
    let contentCursor = cursor + 1;
    while (
      contentCursor < lines.length &&
      lines[contentCursor].trim() &&
      canContinueReferenceDefinition(parts, lines[contentCursor])
    ) {
      parts.push(lines[contentCursor]);
      contentCursor += 1;
    }

    const reference = parseReferenceDefinitionContent(parts.join('\n'));
    if (!reference) return null;

    return {
      label: decodeStringContent(label),
      reference,
      endIndex: contentCursor - 1,
    };
  }

  return null;
};

/**
 * Checks whether a line can continue a link reference definition.
 */
export const canContinueReferenceDefinition = (parts: string[], line: string): boolean => {
  const collected = parts.join('\n').trim();
  if (!collected) return true;
  if (LINE_INDENT.test(line)) return true;
  if (hasOpenReferenceTitle(parts)) return true;

  const parsed = parseReferenceDefinitionContent(collected);
  return (
    parsed?.title === undefined &&
    /^["'(]/.test(line.trim()) &&
    parseReferenceDefinitionContent(`${collected}\n${line}`) !== null
  );
};

/**
 * Checks whether a reference can start after the previous block line.
 */
export const isReferenceStartAfterBlock = (line: string): boolean => {
  return ATX_HEADING.test(line) || isThematicBreak(line);
};

/**
 * Parses a reference destination and optional title from collected content.
 */
export const parseReferenceDefinitionContent = (content: string): ReferenceDefinition | null => {
  let rest = content.trim();
  if (!rest) return null;

  let destination = '';
  if (rest.startsWith('<')) {
    const closeIndex = rest.indexOf('>');
    if (closeIndex === -1) return null;
    destination = rest.slice(1, closeIndex);
    rest = rest.slice(closeIndex + 1);
    if (rest && !/^\s/.test(rest)) return null;
  } else {
    const destinationMatch = DESTINATION_MATCH.exec(rest);
    if (!destinationMatch) return null;
    destination = destinationMatch[0];
    rest = rest.slice(destination.length);
  }

  const title = parseReferenceTitle(rest);
  if (title === null) return null;
  return {
    href: normalizeHref(decodeStringContent(destination)),
    title: title === undefined ? undefined : decodeStringContent(title),
  };
};

/**
 * Parses the optional title portion of a link reference definition.
 */
export const parseReferenceTitle = (source: string): string | undefined | null => {
  const rest = source.trim();
  if (!rest) return undefined;

  const opener = rest[0];
  const closer = opener === '(' ? ')' : opener;
  if (!['"', "'", '('].includes(opener)) return null;
  if (!rest.endsWith(closer)) return null;
  return rest.slice(1, -1);
};

/**
 * Checks whether collected reference content is inside an unclosed title.
 */
export const hasOpenReferenceTitle = (parts: string[]): boolean => {
  const content = parts.join('\n').trim();
  const destination = /^<?\S+>?/.exec(content);
  if (!destination) return false;
  const rest = content.slice(destination[0].length).trimStart();
  if (!rest) return false;
  const opener = rest[0];
  const closer = opener === '(' ? ')' : opener;
  return ['"', "'", '('].includes(opener) && (rest.length === 1 || !rest.endsWith(closer));
};

/**
 * Checks CommonMark thematic break marker runs with optional spaces.
 */
const isThematicBreak = (line: string): boolean => {
  return THEMATIC_BREAK.test(line);
};

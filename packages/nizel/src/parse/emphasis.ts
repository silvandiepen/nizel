import type { NizelInlineNode, NizelTextNode } from '../types.js';

export type EscapedTextNode = NizelTextNode & {
  escaped?: boolean;
};

export type InlineToken =
  | { type: 'node'; node: NizelInlineNode }
  | {
      type: 'delimiter';
      char: '*' | '_';
      close: boolean;
      length: number;
      open: boolean;
    };

/**
 * Resolves emphasis delimiter runs that remain after non-emphasis inline tokenization.
 */
export const resolveRemainingEmphasis = (nodes: NizelInlineNode[]): NizelInlineNode[] => {
  const tokens = tokenizeEmphasisDelimiters(nodes);
  let changed = true;

  while (changed) {
    changed = false;
    for (let closeIndex = 0; closeIndex < tokens.length; closeIndex += 1) {
      const closer = tokens[closeIndex];
      if (closer.type !== 'delimiter' || !closer.close || closer.length === 0) continue;

      for (let openIndex = closeIndex - 1; openIndex >= 0; openIndex -= 1) {
        const opener = tokens[openIndex];
        if (
          opener.type !== 'delimiter' ||
          !opener.open ||
          opener.char !== closer.char ||
          opener.length === 0
        ) {
          continue;
        }

        if (isForbiddenDelimiterMatch(opener, closer)) continue;

        const size = opener.length >= 2 && closer.length >= 2 ? 2 : 1;
        const children = inlineTokensToNodes(tokens.slice(openIndex + 1, closeIndex));
        const wrapped: NizelInlineNode =
          size === 2
            ? { type: 'strong', children: resolveRemainingEmphasis(children) }
            : { type: 'emphasis', children: resolveRemainingEmphasis(children) };

        const replacement: InlineToken[] = [];
        if (opener.length > size) {
          replacement.push({ ...opener, length: opener.length - size });
        }
        replacement.push({ type: 'node', node: wrapped });
        if (closer.length > size) {
          replacement.push({ ...closer, length: closer.length - size });
        }

        tokens.splice(openIndex, closeIndex - openIndex + 1, ...replacement);
        changed = true;
        closeIndex = -1;
        break;
      }
    }
  }

  return inlineTokensToNodes(tokens);
};

/**
 * Splits text nodes into text and emphasis delimiter tokens.
 */
export const tokenizeEmphasisDelimiters = (nodes: NizelInlineNode[]): InlineToken[] => {
  const tokens: InlineToken[] = [];

  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
    const node = nodes[nodeIndex];
    if (node.type !== 'text') {
      tokens.push({ type: 'node', node });
      continue;
    }

    if ((node as EscapedTextNode).escaped === true) {
      tokens.push({ type: 'node', node });
      continue;
    }

    let cursor = 0;
    while (cursor < node.value.length) {
      const character = node.value[cursor];
      if (character !== '*' && character !== '_') {
        const nextDelimiter = nextEmphasisDelimiter(node.value, cursor + 1);
        tokens.push({
          type: 'node',
          node: { type: 'text', value: node.value.slice(cursor, nextDelimiter) },
        });
        cursor = nextDelimiter;
        continue;
      }

      const runStart = cursor;
      while (cursor < node.value.length && node.value[cursor] === character) cursor += 1;
      const runLength = cursor - runStart;
      const before = previousCharacter(tokens);
      const after = node.value[cursor] ?? nextInlineCharacter(nodes, nodeIndex + 1);
      const { open, close } = classifyDelimiterRun(character as '*' | '_', before, after);
      tokens.push({
        type: 'delimiter',
        char: character as '*' | '_',
        close,
        length: runLength,
        open,
      });
    }
  }

  return tokens;
};

/**
 * Gets the next text-like character represented by inline nodes.
 */
export const nextInlineCharacter = (nodes: NizelInlineNode[], startIndex: number): string => {
  for (let index = startIndex; index < nodes.length; index += 1) {
    const character = firstInlineCharacter(nodes[index]);
    if (character) return character;
  }
  return '';
};

/**
 * Gets the first text-like character represented by an inline node.
 */
export const firstInlineCharacter = (node: NizelInlineNode): string => {
  if (node.type === 'text' && node.value) return node.value[0];
  if (node.type === 'lineBreak') return '\n';
  if (node.type === 'inlineCode' && node.code) return node.code[0];
  if (node.type === 'image' && node.alt) return node.alt[0];
  if ('children' in node && node.children.length > 0) {
    for (const child of node.children) {
      const character = firstInlineCharacter(child);
      if (character) return character;
    }
  }
  return '';
};

/**
 * Applies CommonMark's rule that forbids some mixed-length delimiter matches.
 */
export const isForbiddenDelimiterMatch = (
  opener: Extract<InlineToken, { type: 'delimiter' }>,
  closer: Extract<InlineToken, { type: 'delimiter' }>,
): boolean => {
  if (opener.char !== closer.char) return true;
  if (!(opener.close || closer.open)) return false;
  return (opener.length + closer.length) % 3 === 0 && opener.length % 3 !== 0 && closer.length % 3 !== 0;
};

/**
 * Finds the next emphasis delimiter in a text run.
 */
export const nextEmphasisDelimiter = (source: string, startIndex: number): number => {
  let index = startIndex;
  while (index < source.length && source[index] !== '*' && source[index] !== '_') index += 1;
  return index;
};

/**
 * Gets the previous visible character from emitted inline tokens.
 */
export const previousCharacter = (tokens: InlineToken[]): string => {
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.type === 'delimiter' && token.length > 0) return token.char;
    if (token.type === 'node') {
      const character = lastInlineCharacter(token.node);
      if (character) return character;
    }
  }
  return '';
};

/**
 * Gets the last text-like character represented by an inline node.
 */
export const lastInlineCharacter = (node: NizelInlineNode): string => {
  if (node.type === 'text' && node.value) return node.value[node.value.length - 1];
  if (node.type === 'lineBreak') return '\n';
  if (node.type === 'inlineCode' && node.code) return node.code[node.code.length - 1];
  if (node.type === 'image' && node.alt) return node.alt[node.alt.length - 1];
  if ('children' in node && node.children.length > 0) {
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      const character = lastInlineCharacter(node.children[index]);
      if (character) return character;
    }
  }
  return '';
};

/**
 * Applies CommonMark left/right-flanking delimiter rules.
 */
export const classifyDelimiterRun = (
  char: '*' | '_',
  before: string,
  after: string,
): { open: boolean; close: boolean } => {
  const beforeWhitespace = before === '' || /\s/u.test(before);
  const afterWhitespace = after === '' || /\s/u.test(after);
  const beforePunctuation = isUnicodePunctuation(before);
  const afterPunctuation = isUnicodePunctuation(after);
  const leftFlanking = !afterWhitespace && (!afterPunctuation || beforeWhitespace || beforePunctuation);
  const rightFlanking = !beforeWhitespace && (!beforePunctuation || afterWhitespace || afterPunctuation);

  if (char === '_') {
    return {
      open: leftFlanking && (!rightFlanking || beforePunctuation),
      close: rightFlanking && (!leftFlanking || afterPunctuation),
    };
  }

  return { open: leftFlanking, close: rightFlanking };
};

/**
 * Checks whether a character is Unicode punctuation.
 */
export const isUnicodePunctuation = (character: string): boolean => {
  return character !== '' && /[\p{P}\p{S}]/u.test(character);
};

/**
 * Converts delimiter tokens back to inline nodes.
 */
export const inlineTokensToNodes = (tokens: InlineToken[]): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  for (const token of tokens) {
    if (token.type === 'delimiter') {
      appendTextNode(nodes, token.char.repeat(token.length));
      continue;
    }
    if (token.node.type === 'text') {
      appendTextNode(nodes, token.node.value);
    } else {
      nodes.push(token.node);
    }
  }
  return nodes;
};

/**
 * Appends text while coalescing adjacent text nodes.
 */
export const appendTextNode = (nodes: NizelInlineNode[], value: string): void => {
  if (!value) return;
  const previous = nodes[nodes.length - 1];
  if (previous?.type === 'text') {
    previous.value += value;
    return;
  }
  nodes.push({ type: 'text', value });
};

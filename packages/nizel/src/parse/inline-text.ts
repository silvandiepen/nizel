import type { NizelInlineNode } from '../types.js';

/**
 * Converts inline nodes to plain text.
 */
export const stripInlineNodes = (nodes: NizelInlineNode[]): string => {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'lineBreak') return '\n';
      if (node.type === 'inlineCode') return node.code;
      if (node.type === 'image') return node.alt ?? '';
      if ('children' in node) return stripInlineNodes(node.children);
      return '';
    })
    .join('');
};

/**
 * Removes a single trailing space before a CommonMark soft line break.
 */
export const trimTrailingSoftBreakSpace = (nodes: NizelInlineNode[]): void => {
  const previous = nodes[nodes.length - 1];
  if (previous?.type === 'text' && /(?<! ) $/.test(previous.value)) {
    previous.value = previous.value.slice(0, -1);
  }
};

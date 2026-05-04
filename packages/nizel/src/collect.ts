import type {
  NizelBlockNode,
  NizelHeading,
  NizelImage,
  NizelInlineNode,
  NizelLink,
  NizelNode,
  NizelRootNode,
} from './types.js';

/**
 * Walks a Nizel AST and extracts text, headings, links, images, and reading time.
 */
export function collect(ast: NizelRootNode): {
  text: string;
  headings: NizelHeading[];
  links: NizelLink[];
  images: NizelImage[];
  excerpt: string | undefined;
  readingTime: { words: number; minutes: number };
} {
  const headings: NizelHeading[] = [];
  const links: NizelLink[] = [];
  const images: NizelImage[] = [];
  const text = blockText(ast.children, { headings, links, images }).trim();
  const words = text ? text.split(/\s+/).length : 0;

  return {
    text,
    headings,
    links,
    images,
    excerpt: text ? text.slice(0, 160).trim() : undefined,
    readingTime: {
      words,
      minutes: Math.max(1, Math.ceil(words / 200)),
    },
  };
}

/**
 * Converts block nodes to plain text while collecting structural metadata.
 */
function blockText(
  nodes: NizelBlockNode[],
  state: {
    headings: NizelHeading[];
    links: NizelLink[];
    images: NizelImage[];
  },
): string {
  return nodes
    .map((node) => {
      if (node.type === 'heading') {
        const text = inlineText(node.children, state);
        state.headings.push({
          id: node.id ?? '',
          slug: node.id ?? '',
          text,
          depth: node.depth,
          level: node.depth,
        });
        return text;
      }

      if (node.type === 'paragraph') return inlineText(node.children, state);
      if (node.type === 'code') return node.code;
      if (node.type === 'list') {
        return node.children
          .map((item) => blockText(item.children, state))
          .join('\n');
      }
      if (node.type === 'blockquote') return blockText(node.children, state);
      if (node.type === 'table') {
        return node.children
          .map((row) => row.children.map((cell) => inlineText(cell.children, state)).join('\t'))
          .join('\n');
      }
      if (node.type === 'html') return node.value;
      if (node.type === 'customBlock') return nestedText(node.children ?? [], state);
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Converts inline nodes to plain text while collecting links and images.
 */
function inlineText(
  nodes: NizelInlineNode[],
  state: {
    links: NizelLink[];
    images: NizelImage[];
  },
): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value;
      if (node.type === 'inlineHtml') return '';
      if (node.type === 'lineBreak') return ' ';
      if (node.type === 'inlineCode') return node.code;
      if (node.type === 'image') {
        state.images.push({
          src: node.src,
          alt: node.alt,
          title: node.title,
        });
        return node.alt ?? '';
      }
      if (node.type === 'link') {
        const text = inlineText(node.children, state);
        state.links.push({
          href: node.href,
          text,
          title: node.title,
          external: Boolean(node.external),
        });
        return text;
      }
      return inlineText(node.children, state);
    })
    .join('');
}

/**
 * Converts mixed nested nodes to plain text for custom block content.
 */
function nestedText(
  nodes: NizelNode[],
  state: {
    headings: NizelHeading[];
    links: NizelLink[];
    images: NizelImage[];
  },
): string {
  return nodes
    .map((node) => {
      if (node.type === 'root') return blockText(node.children, state);
      if (isBlock(node)) return blockText([node], state);
      if (isInline(node)) return inlineText([node], state);
      if (node.type === 'listItem') return blockText(node.children, state);
      if (node.type === 'tableRow') {
        return node.children.map((cell) => inlineText(cell.children, state)).join('\t');
      }
      if (node.type === 'tableCell') return inlineText(node.children, state);
      return '';
    })
    .join('\n');
}

/**
 * Narrows a mixed node to an inline node.
 */
function isInline(node: NizelNode): node is NizelInlineNode {
  return [
    'text',
    'emphasis',
    'strong',
    'delete',
    'lineBreak',
    'inlineCode',
    'link',
    'image',
    'inlineHtml',
  ].includes(node.type);
}

/**
 * Narrows a mixed node to a block node.
 */
function isBlock(node: NizelNode): node is NizelBlockNode {
  return ![
    'root',
    'text',
    'emphasis',
    'strong',
    'delete',
    'lineBreak',
    'inlineCode',
    'link',
    'image',
  ].includes(node.type);
}

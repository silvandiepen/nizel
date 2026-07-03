import type {
  NizelBlockDefinition,
  NizelBlockNode,
  NizelHtmlDocNode,
  NizelHtmlToMarkdownHandler,
  NizelInlineNode,
  NizelPlugin,
  NizelRootNode,
} from 'nizel';
import { findHtmlElement, hasHtmlClass, htmlChildElements, htmlRoot } from 'nizel';

export type FootnotesPluginOptions = {
  className?: string;
};

type FootnotesValue = {
  entries: Array<{ index: number; id: string; content: string }>;
};

/**
 * Adds opt-in `[^id]` footnote references and definitions.
 */
export const footnotesPlugin = (options: FootnotesPluginOptions = {}): NizelPlugin => {
  return {
    name: 'footnotes',
    blocks: {
      footnotes: footnotesBlock(options),
    },
    hooks: {
      beforeParse: transformFootnotes,
      afterParse: transformFootnoteRefs,
    },
    htmlToMarkdown: footnotesToMarkdown(options),
  };
};

/**
 * Converts rendered footnote references and definition sections back into `[^id]` Markdown.
 */
export const footnotesToMarkdown = (options: FootnotesPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const className = options.className ?? 'footnotes';
  return (node, ctx) => {
    if (node.type !== 'element') return undefined;

    if (node.tag === 'sup') {
      const anchor = findHtmlElement(node, (el) => el.tag === 'a' && hasHtmlClass(el, 'footnote-ref'));
      const match = anchor ? /^#fn-(.+)$/.exec(anchor.attrs.href ?? '') : undefined;
      return match ? `[^${match[1]}]` : undefined;
    }

    if (node.tag === 'section' && hasHtmlClass(node, className)) {
      const list = findHtmlElement(node, (el) => el.tag === 'ol');
      const items = list ? htmlChildElements(list).filter((el) => el.tag === 'li') : [];
      return items
        .map((li) => {
          const id = /^fn-(.+)$/.exec(li.attrs.id ?? '')?.[1] ?? '';
          const body = ctx.block(htmlRoot(stripBackrefs(li.children, className))).trim();
          return `[^${id}]: ${body}`;
        })
        .join('\n');
    }

    return undefined;
  };
};

/**
 * Recursively removes footnote back-reference anchors from a subtree.
 */
const stripBackrefs = (nodes: NizelHtmlDocNode[], className: string): NizelHtmlDocNode[] => {
  const result: NizelHtmlDocNode[] = [];
  for (const node of nodes) {
    if (node.type === 'element') {
      if (hasHtmlClass(node, `${className}__backref`)) continue;
      result.push({ ...node, children: stripBackrefs(node.children, className) });
    } else {
      result.push(node);
    }
  }
  return result;
};

export const transformFootnotes = (markdown: string): string => {
  const lines = markdown.split('\n');
  const body: string[] = [];
  const footnotes: Array<{ id: string; content: string }> = [];

  for (const line of lines) {
    const definition = /^\[\^([^\]]+)\]:\s*(.*)$/.exec(line);
    if (!definition) {
      body.push(line);
      continue;
    }
    footnotes.push({ id: definition[1], content: definition[2] });
  }

  const orderedIds = new Map(footnotes.map((entry, index) => [entry.id, index + 1]));
  const transformedBody = body.join('\n').replace(/\[\^([^\]]+)\]/g, (match, id: string) => {
    const index = orderedIds.get(id);
    return index === undefined ? match : `{{nizel-footnote-ref:${id}:${index}}}`;
  });

  if (footnotes.length === 0) return transformedBody;
  return [
    transformedBody,
    '',
    '::footnotes',
    ...footnotes.map((entry, index) => `${index + 1}\t${entry.id}\t${entry.content}`),
    '::',
  ].join('\n');
};

export const transformFootnoteRefs = (ast: NizelRootNode): NizelRootNode => {
  return { ...ast, children: ast.children.map(transformBlock) };
};

const footnotesBlock = (options: FootnotesPluginOptions): NizelBlockDefinition => ({
  name: 'footnotes',
  parse({ content }): FootnotesValue {
    return {
      entries: content
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [index, id, ...contentParts] = line.split('\t');
          return { index: Number(index), id, content: contentParts.join('\t') };
        }),
    };
  },
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const entries = (node.value as FootnotesValue | undefined)?.entries ?? [];
      const className = options.className ?? 'footnotes';
      const items = entries
        .map((entry) => `<li id="fn-${slug(entry.id)}">${ctx.escape(entry.content)} <a href="#fnref-${slug(entry.id)}" class="${className}__backref">↩</a></li>`)
        .join('');
      return `<section class="${ctx.escape(className)}"><ol>${items}</ol></section>`;
    },
  },
});

const transformBlock = (node: NizelBlockNode): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return { ...node, children: transformInlineNodes(node.children) } as NizelBlockNode;
  }
  if (node.type === 'blockquote') return { ...node, children: node.children.map(transformBlock) };
  if (node.type === 'list') {
    return { ...node, children: node.children.map((item) => ({ ...item, children: item.children.map(transformBlock) })) };
  }
  if (node.type === 'table') {
    return {
      ...node,
      children: node.children.map((row) => ({
        ...row,
        children: row.children.map((cell) => ({ ...cell, children: transformInlineNodes(cell.children) })),
      })),
    };
  }
  if (node.type === 'customBlock') return { ...node, children: node.children?.map(transformBlock) };
  return node;
};

const transformInlineNodes = (nodes: NizelInlineNode[]): NizelInlineNode[] => {
  const transformed: NizelInlineNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') transformed.push(...transformText(node.value));
    else if ('children' in node) transformed.push({ ...node, children: transformInlineNodes(node.children) } as NizelInlineNode);
    else transformed.push(node);
  }
  return transformed;
};

const transformText = (value: string): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  const pattern = /\{\{nizel-footnote-ref:([^:}]+):([0-9]+)\}\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    const id = slug(match[1]);
    nodes.push({ type: 'inlineHtml', value: `<sup id="fnref-${id}"><a href="#fn-${id}" class="footnote-ref">${escapeHtml(match[2])}</a></sup>` });
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < value.length) nodes.push({ type: 'text', value: value.slice(lastIndex) });
  return nodes;
};

const slug = (value: string): string => value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default footnotesPlugin;

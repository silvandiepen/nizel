import type { NizelBlockDefinition, NizelBlockNode, NizelHtmlToMarkdownHandler, NizelInlineNode, NizelPlugin, NizelRootNode } from 'nizel';
import { findHtmlElement, hasHtmlClass, htmlChildElements, htmlRoot } from 'nizel';

export type CitationsPluginOptions = {
  className?: string;
};

type CitationValue = {
  entries: Array<{ id: string; text: string }>;
};

export const citationsPlugin = (options: CitationsPluginOptions = {}): NizelPlugin => {
  let citations: Record<string, string> = {};
  return {
    name: 'citations',
    blocks: {
      bibliography: bibliographyBlock(options),
    },
    hooks: {
      beforeParse(markdown) {
        const result = extractCitations(markdown);
        citations = result.citations;
        return result.markdown;
      },
      afterParse(ast) {
        return appendBibliography(replaceCitationRefs(ast, citations), citations);
      },
    },
    htmlToMarkdown: citationsToMarkdown(options),
  };
};

/**
 * Converts rendered citation references and bibliographies back into `[@id]` Markdown.
 */
export const citationsToMarkdown = (options: CitationsPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const className = options.className ?? 'citations';
  return (node, ctx) => {
    if (node.type !== 'element') return undefined;

    if (node.tag === 'a' && hasHtmlClass(node, 'citation')) {
      const match = /^#cite-(.+)$/.exec(node.attrs.href ?? '');
      return match ? `[@${match[1]}]` : undefined;
    }

    if (node.tag === 'section' && hasHtmlClass(node, className)) {
      const list = findHtmlElement(node, (el) => el.tag === 'ol');
      const items = list ? htmlChildElements(list).filter((el) => el.tag === 'li') : [];
      return items
        .map((li) => {
          const id = /^cite-(.+)$/.exec(li.attrs.id ?? '')?.[1] ?? '';
          return `[@${id}]: ${ctx.block(htmlRoot(li.children)).trim()}`;
        })
        .join('\n');
    }

    return undefined;
  };
};

export const extractCitations = (markdown: string): { markdown: string; citations: Record<string, string> } => {
  const citations: Record<string, string> = {};
  const lines = markdown.split('\n').filter((line) => {
    const match = /^\[@([A-Za-z0-9_-]+)\]:\s*(.+)$/.exec(line);
    if (!match) return true;
    citations[match[1]] = match[2];
    return false;
  });
  return { markdown: lines.join('\n'), citations };
};

const replaceCitationRefs = (ast: NizelRootNode, citations: Record<string, string>): NizelRootNode => ({
  ...ast,
  children: ast.children.map((node) => transformBlock(node, citations)),
});

const appendBibliography = (ast: NizelRootNode, citations: Record<string, string>): NizelRootNode => {
  const entries = Object.entries(citations).map(([id, text]) => `${id}\t${text}`);
  if (entries.length === 0) return ast;
  return {
    ...ast,
    children: [...ast.children, { type: 'customBlock', name: 'bibliography', value: { entries: Object.entries(citations).map(([id, text]) => ({ id, text })) }, children: [] }],
  };
};

const bibliographyBlock = (options: CitationsPluginOptions): NizelBlockDefinition => ({
  name: 'bibliography',
  parse({ content }): CitationValue {
    return { entries: content.split('\n').filter(Boolean).map((line) => {
      const [id, ...text] = line.split('\t');
      return { id, text: text.join('\t') };
    }) };
  },
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const entries = (node.value as CitationValue | undefined)?.entries ?? [];
      const items = entries.map((entry) => `<li id="cite-${ctx.escape(entry.id)}">${ctx.escape(entry.text)}</li>`).join('');
      return `<section class="${ctx.escape(options.className ?? 'citations')}"><ol>${items}</ol></section>`;
    },
  },
});

const transformBlock = (node: NizelBlockNode, citations: Record<string, string>): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') return { ...node, children: transformInline(node.children, citations) } as NizelBlockNode;
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, citations)) };
  if (node.type === 'list') return { ...node, children: node.children.map((item) => ({ ...item, children: item.children.map((child) => transformBlock(child, citations)) })) };
  return node;
};

const transformInline = (nodes: NizelInlineNode[], citations: Record<string, string>): NizelInlineNode[] => nodes.flatMap((node) => {
  if (node.type === 'text') return replaceText(node.value, citations);
  if ('children' in node) return [{ ...node, children: transformInline(node.children, citations) } as NizelInlineNode];
  return [node];
});

const replaceText = (value: string, citations: Record<string, string>): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  const pattern = /\[@([A-Za-z0-9_-]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > lastIndex) nodes.push({ type: 'text', value: value.slice(lastIndex, match.index) });
    nodes.push(citations[match[1]]
      ? { type: 'inlineHtml', value: `<a class="citation" href="#cite-${escapeHtml(match[1])}">[${escapeHtml(match[1])}]</a>` }
      : { type: 'text', value: match[0] });
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < value.length) nodes.push({ type: 'text', value: value.slice(lastIndex) });
  return nodes;
};

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default citationsPlugin;

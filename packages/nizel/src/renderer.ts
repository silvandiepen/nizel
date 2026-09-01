import type {
  NizelDocument,
  NizelNode,
  NizelRendererProps,
  NizelRootNode,
  NizelTreeRenderOptions,
} from './types.js';

/** Renders a Nizel AST through a host adapter shared by framework integrations. */
export function renderNizelTree<TOutput>(
  value: NizelRootNode | NizelDocument,
  options: NizelTreeRenderOptions<TOutput>,
): TOutput {
  const root = 'schema' in value ? value.ast : value;
  const lastText = options.streaming && options.caret ? findLastText(root) : undefined;

  /** Recursively converts one Nizel node into a host-renderer output. */
  const render = (node: NizelNode): TOutput => {
    if (node.type === 'text') {
      const output = options.adapter.text(node.value, node);
      if (node !== lastText || !options.adapter.caret) return output;
      return options.adapter.element('fragment', {}, [output, options.adapter.caret(caretProps(options.caret))], node);
    }

    const descriptor = describeNode(node);
    const name = options.components?.[descriptor.name] ?? descriptor.name;
    const children = descriptor.children.map(render);
    return options.adapter.element(name, descriptor.props, children, node);
  };

  return render(root);
}

type NodeDescriptor = {
  name: string;
  props: NizelRendererProps;
  children: NizelNode[];
};

/** Maps a Nizel node to a semantic host element and serializable props. */
function describeNode(node: Exclude<NizelNode, { type: 'text' }>): NodeDescriptor {
  if (node.type === 'root') return { name: 'root', props: {}, children: node.children };
  if (node.type === 'paragraph') return { name: 'p', props: {}, children: node.children };
  if (node.type === 'heading') return { name: `h${node.depth}`, props: { id: node.id }, children: node.children };
  if (node.type === 'emphasis') return { name: 'em', props: {}, children: node.children };
  if (node.type === 'strong') return { name: 'strong', props: {}, children: node.children };
  if (node.type === 'delete') return { name: 'del', props: {}, children: node.children };
  if (node.type === 'lineBreak') return { name: 'br', props: { hard: node.hard }, children: [] };
  if (node.type === 'inlineCode') return { name: 'code', props: { inline: true, code: node.code }, children: [] };
  if (node.type === 'code') return { name: 'pre', props: { code: node.code, language: node.lang, meta: node.meta, filename: node.filename, highlightLines: node.highlightLines }, children: [] };
  if (node.type === 'link') return { name: 'a', props: { href: node.href, title: node.title, external: node.external }, children: node.children };
  if (node.type === 'image') return { name: 'img', props: { src: node.src, alt: node.alt, title: node.title }, children: [] };
  if (node.type === 'inlineHtml' || node.type === 'html') return { name: 'rawHtml', props: { value: node.value }, children: [] };
  if (node.type === 'list') return { name: node.ordered ? 'ol' : 'ul', props: { start: node.start, tight: node.tight }, children: node.children };
  if (node.type === 'listItem') return { name: 'li', props: { checked: node.checked }, children: node.children };
  if (node.type === 'blockquote') return { name: 'blockquote', props: {}, children: node.children };
  if (node.type === 'thematicBreak') return { name: 'hr', props: {}, children: [] };
  if (node.type === 'table') return { name: 'table', props: { align: node.align }, children: node.children };
  if (node.type === 'tableRow') return { name: 'tr', props: {}, children: node.children };
  if (node.type === 'tableCell') return { name: 'td', props: {}, children: node.children };
  return { name: node.name, props: { args: node.args, ...node.props, value: node.value }, children: node.children ?? [] };
}

/** Finds the final text leaf used as the streaming caret anchor. */
function findLastText(root: NizelRootNode): Extract<NizelNode, { type: 'text' }> | undefined {
  let found: Extract<NizelNode, { type: 'text' }> | undefined;
  /** Visits candidate children in document order. */
  const walk = (node: NizelNode): void => {
    if (node.type === 'text') found = node;
    if ('children' in node && Array.isArray(node.children)) node.children.forEach((child) => walk(child as NizelNode));
  };
  walk(root);
  return found;
}

/** Normalizes boolean or object caret configuration. */
function caretProps(value: NizelTreeRenderOptions<unknown>['caret']): NizelRendererProps {
  return value && typeof value === 'object' ? value : {};
}

import type {
  NizelBlockMap,
  NizelBlockNode,
  NizelElementDescriptor,
  NizelElementRules,
  NizelInlineNode,
  NizelNode,
  NizelRenderOptions,
  NizelRootNode,
} from './types.js';
import { escapeHtml } from './utils.js';

/**
 * Renders a Nizel root AST to safe HTML.
 */
export function renderHtml(
  ast: NizelRootNode,
  elements: NizelElementRules,
  blocks: NizelBlockMap = {},
  options: NizelRenderOptions = {},
): string {
  return ast.children.map((node) => renderBlock(node, elements, blocks, options)).join('\n');
}

/**
 * Renders one block node to HTML.
 */
function renderBlock(
  node: NizelBlockNode,
  elements: NizelElementRules,
  blocks: NizelBlockMap,
  options: NizelRenderOptions,
): string {
  if (node.type === 'heading') {
    const tag = `h${node.depth}`;
    return wrap(resolveTag(tag, node, elements), renderInline(node.children, elements), {
      id: node.id,
      ...attrsFor(tag, node, elements),
    });
  }

  if (node.type === 'paragraph') {
    if (options.unwrapStandaloneImages && isStandaloneImageParagraph(node.children)) {
      return renderInline(node.children, elements);
    }

    return wrap(resolveTag('p', node, elements), renderInline(node.children, elements), attrsFor('p', node, elements));
  }

  if (node.type === 'code') {
    const renderer = blocks.code?.formats?.html;
    if (renderer) {
      return renderer(node, {
        render(nodes) {
          return Array.isArray(nodes) && nodes[0] && isInline(nodes[0])
            ? renderInline(nodes as NizelInlineNode[], elements)
            : (nodes as NizelBlockNode[])
                .map((child) => renderBlock(child, elements, blocks, options))
                .join('\n');
        },
        escape: escapeHtml,
      });
    }

    const code = wrap(resolveTag('code', node, elements), escapeHtml(node.code), {
      class: node.lang ? `language-${node.lang}` : undefined,
      'data-filename': node.filename,
      'data-highlight-lines': node.highlightLines?.join(','),
    });
    return wrap(resolveTag('pre', node, elements), code, attrsFor('pre', node, elements));
  }

  if (node.type === 'list') {
    const tag = node.ordered ? 'ol' : 'ul';
    const items = node.children
      .map((item) =>
        wrap(
          resolveTag('li', item, elements),
          renderListItemChildren(item.children, node.tight === true, elements, blocks, options),
          {
            'data-checked': item.checked,
            ...attrsFor('li', item, elements),
          },
        ),
      )
      .join('\n');
    return wrap(
      resolveTag(tag, node, elements),
      `\n${items}\n`,
      {
        start: node.start !== undefined && node.start !== 1 ? node.start : undefined,
        ...attrsFor(tag, node, elements),
      },
    );
  }

  if (node.type === 'blockquote') {
    return wrap(
      resolveTag('blockquote', node, elements),
      node.children.length > 0
        ? `\n${node.children.map((child) => renderBlock(child, elements, blocks, options)).join('\n')}\n`
        : '\n',
      attrsFor('blockquote', node, elements),
    );
  }

  if (node.type === 'table') {
    const [header, ...rows] = node.children;
    const head = header
      ? wrap(
          resolveTag('thead', header, elements),
          wrap(
            resolveTag('tr', header, elements),
            header.children
              .map((cell, index) =>
                wrap(resolveTag('th', cell, elements), renderInline(cell.children, elements), tableCellAttrs(node.align?.[index])),
              )
              .join(''),
          ),
        )
      : '';
    const body = wrap(
      resolveTag('tbody', node, elements),
      rows
        .map((row) =>
          wrap(
            resolveTag('tr', row, elements),
            row.children
              .map((cell, index) =>
                wrap(resolveTag('td', cell, elements), renderInline(cell.children, elements), tableCellAttrs(node.align?.[index])),
              )
              .join(''),
          ),
        )
        .join(''),
    );
    return wrap(resolveTag('table', node, elements), head + body, attrsFor('table', node, elements));
  }

  if (node.type === 'thematicBreak') return `<hr${serializeAttrs(attrsFor('hr', node, elements))} />`;
  if (node.type === 'html') return node.value;
  if (node.type === 'customBlock') {
    const renderer = blocks[node.name]?.formats?.html;
    if (renderer) {
      return renderer(node, {
        render(nodes) {
          return Array.isArray(nodes) && nodes[0] && isInline(nodes[0])
            ? renderInline(nodes as NizelInlineNode[], elements)
            : (nodes as NizelBlockNode[])
                .map((child) => renderBlock(child, elements, blocks, options))
                .join('\n');
        },
        escape: escapeHtml,
      });
    }

    return wrap(
      resolveTag('div', node, elements),
      (node.children ?? []).map((child) => renderBlock(child, elements, blocks, options)).join('\n'),
      {
        'data-nizel-block': node.name,
        ...attrsFor(node.name, node, elements),
      },
    );
  }

  return '';
}

/**
 * Checks whether a paragraph contains only one image node.
 */
function isStandaloneImageParagraph(nodes: NizelInlineNode[]): boolean {
  return nodes.length === 1 && nodes[0].type === 'image';
}

/**
 * Renders list item content with tight-list paragraph elision.
 */
function renderListItemChildren(
  children: NizelBlockNode[],
  tight: boolean,
  elements: NizelElementRules,
  blocks: NizelBlockMap,
  options: NizelRenderOptions,
): string {
  if (children.length === 0) return '';

  if (!tight) {
    return `\n${children.map((child) => renderBlock(child, elements, blocks, options)).join('\n')}\n`;
  }

  const hasBlockChild = children.some((child) => child.type !== 'paragraph');
  const body = children
    .map((child) => {
      if (child.type === 'paragraph') return renderInline(child.children, elements);
      return renderBlock(child, elements, blocks, options);
    })
    .join('\n');

  if (!hasBlockChild) return body;
  if (children[children.length - 1]?.type === 'paragraph') return `\n${body}`;
  return children[0]?.type === 'paragraph' ? `${body}\n` : `\n${body}\n`;
}

/**
 * Renders inline nodes to HTML.
 */
function renderInline(nodes: NizelInlineNode[], elements: NizelElementRules): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) return renderInlineNode(nodes[0], elements);

  return nodes
    .map((node) => renderInlineNode(node, elements))
    .join('');
}

/**
 * Renders one inline node to HTML.
 */
function renderInlineNode(node: NizelInlineNode, elements: NizelElementRules): string {
  if (node.type === 'text') return escapeHtml(node.value);
  if (node.type === 'inlineHtml') return node.value;
  if (node.type === 'lineBreak') {
    if (!node.hard) return '\n';
    const brAttrs = attrsFor('br', node, elements);
    return `<br${serializeAttrs(brAttrs)} />\n`;
  }
  if (node.type === 'inlineCode') {
    return wrap(resolveTag('code', node, elements), escapeHtml(node.code), attrsFor('code', node, elements));
  }
  if (node.type === 'strong') {
    return wrap(resolveTag('strong', node, elements), renderInline(node.children, elements), attrsFor('strong', node, elements));
  }
  if (node.type === 'emphasis') {
    return wrap(resolveTag('em', node, elements), renderInline(node.children, elements), attrsFor('em', node, elements));
  }
  if (node.type === 'delete') {
    return wrap(resolveTag('del', node, elements), renderInline(node.children, elements), attrsFor('del', node, elements));
  }
  if (node.type === 'image') {
    return `<img${serializeAttrs({
      src: node.src,
      alt: node.alt ?? '',
      title: node.title,
      ...attrsFor('img', node, elements),
    })} />`;
  }
  if (node.type === 'link') {
    const href = node.href?.toLowerCase().trim().startsWith('javascript:') ? undefined : node.href;
    return wrap(resolveTag('a', node, elements), renderInline(node.children, elements), {
      href: href,
      title: node.title,
      ...attrsFor('a', node, elements),
    });
  }
  return '';
}

/**
 * Resolves a possibly-overridden tag from element rules.
 */
function resolveTag(defaultTag: string, node: NizelNode, elements: NizelElementRules): string {
  const rule = elements[defaultTag];
  if (!rule) return defaultTag;
  const descriptor = typeof rule === 'function' ? rule(node) : rule;
  return descriptor?.tag ?? defaultTag;
}

/**
 * Resolves static or dynamic element descriptors for a tag.
 */
function attrsFor(
  tag: string,
  node: NizelNode,
  elements: NizelElementRules,
): Record<string, string | number | boolean | undefined> {
  const rule = elements[tag];
  if (!rule) return {};
  const descriptor: NizelElementDescriptor | undefined =
    typeof rule === 'function' ? rule(node) : rule;
  if (!descriptor) return {};

  const { tag: _t, class: _c, attr, attrs, ...rest } = descriptor;
  return { class: _c, ...(attr ?? attrs), ...rest };
}

/**
 * Converts table alignment metadata into HTML table cell attributes.
 */
function tableCellAttrs(
  align: 'left' | 'center' | 'right' | null | undefined,
): Record<string, string | undefined> {
  return { align: align ?? undefined };
}

/**
 * Wraps rendered content in an HTML tag with serialized attributes.
 */
function wrap(
  tag: string,
  content: string,
  attrs: Record<string, string | number | boolean | undefined> = {},
): string {
  return `<${tag}${serializeAttrs(attrs)}>${content}</${tag}>`;
}

/**
 * Serializes an attribute map with HTML escaping and boolean handling.
 */
function serializeAttrs(
  attrs: Record<string, string | number | boolean | undefined>,
): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== false)
    .filter(([key]) => !/^on[a-z]+$/i.test(key))
    .map(([key, value]) => {
      if (value === true) return ` ${key}`;
      return ` ${key}="${escapeHtml(value)}"`;
    })
    .join('');
}

/**
 * Narrows any Nizel node to an inline node for renderer callbacks.
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

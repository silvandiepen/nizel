import type {
  NizelBlockNode,
  NizelDocument,
  NizelInlineNode,
  NizelListItemNode,
  NizelMarkdownRenderOptions,
  NizelRootNode,
  NizelTableCellNode,
} from './types.js';

/** Renders a Nizel AST or portable document back to normalized Markdown. */
export function renderMarkdown(
  value: NizelRootNode | NizelDocument,
  options: NizelMarkdownRenderOptions = {},
): string {
  const document = 'schema' in value ? value : undefined;
  const body = renderBlocks((document?.ast ?? value as NizelRootNode).children, options).trim();
  if (!document || options.frontmatter === false || Object.keys(document.meta).length === 0) return body;
  return `---\n${renderYaml(document.meta)}\n---${body ? `\n\n${body}` : ''}`;
}

/** Renders sibling block nodes separated by blank lines. */
function renderBlocks(nodes: NizelBlockNode[], options: NizelMarkdownRenderOptions): string {
  return nodes.map((node) => renderBlock(node, options)).filter(Boolean).join('\n\n');
}

/** Renders one block node to normalized Markdown. */
function renderBlock(node: NizelBlockNode, options: NizelMarkdownRenderOptions): string {
  if (node.type === 'paragraph') return renderInline(node.children);
  if (node.type === 'heading') return `${'#'.repeat(node.depth)} ${renderInline(node.children)}`;
  if (node.type === 'thematicBreak') return '---';
  if (node.type === 'html') return node.value;
  if (node.type === 'code') {
    const marker = options.fence ?? '`';
    const length = Math.max(3, longestRun(node.code, marker) + 1);
    const fence = marker.repeat(length);
    const meta = node.meta === node.lang ? undefined : node.meta;
    const info = [node.lang, meta].filter(Boolean).join(' ');
    return `${fence}${info}\n${node.code.replace(/\n$/, '')}\n${fence}`;
  }
  if (node.type === 'blockquote') return prefixLines(renderBlocks(node.children, options), '> ');
  if (node.type === 'list') {
    return node.children.map((item, index) => renderListItem(item, node.ordered ? `${(node.start ?? 1) + index}.` : options.bullet ?? '-', options)).join('\n');
  }
  if (node.type === 'table') return renderTable(node.children, node.align);
  if (node.type === 'customBlock') {
    const custom = options.customBlocks?.[node.name];
    if (custom) return custom(node, { render: (children) => renderBlocks(children, options) });
    const args = node.args?.length ? ` ${node.args.join(' ')}` : '';
    const props = node.props && Object.keys(node.props).length ? `\n${renderYaml(node.props)}\n::` : '';
    const children = node.children?.length ? `\n${renderBlocks(node.children, options)}` : '';
    return `::${node.name}${args}${props}${children}\n::`;
  }
  return '';
}

/** Renders an inline-node sequence without surrounding block whitespace. */
function renderInline(nodes: NizelInlineNode[]): string {
  return nodes.map((node) => {
    if (node.type === 'text') return escapeText(node.value);
    if (node.type === 'lineBreak') return node.hard ? '  \n' : '\n';
    if (node.type === 'strong') return `**${renderInline(node.children)}**`;
    if (node.type === 'emphasis') return `*${renderInline(node.children)}*`;
    if (node.type === 'delete') return `~~${renderInline(node.children)}~~`;
    if (node.type === 'inlineCode') return renderCodeSpan(node.code);
    if (node.type === 'link') return `[${renderInline(node.children)}](${escapeDestination(node.href)}${node.title ? ` "${node.title.replaceAll('"', '\\"')}"` : ''})`;
    if (node.type === 'image') return `![${escapeLabel(node.alt ?? '')}](${escapeDestination(node.src)}${node.title ? ` "${node.title.replaceAll('"', '\\"')}"` : ''})`;
    if (node.type === 'inlineHtml') return node.value;
    return '';
  }).join('');
}

/** Renders and aligns a list item under its marker. */
function renderListItem(item: NizelListItemNode, marker: string, options: NizelMarkdownRenderOptions): string {
  const checkbox = item.checked === undefined ? '' : `[${item.checked ? 'x' : ' '}] `;
  const body = renderBlocks(item.children, options);
  const lines = body.split('\n');
  return `${marker} ${checkbox}${lines[0] ?? ''}${lines.slice(1).map((line) => `\n${' '.repeat(marker.length + 1)}${line}`).join('')}`;
}

/** Renders table rows with a GFM alignment divider. */
function renderTable(rows: { children: NizelTableCellNode[] }[], align: Array<'left' | 'center' | 'right' | null> = []): string {
  if (!rows.length) return '';
  const width = Math.max(...rows.map((row) => row.children.length));
  const line = (cells: NizelTableCellNode[]) => `| ${Array.from({ length: width }, (_, index) => escapeTable(renderInline(cells[index]?.children ?? []))).join(' | ')} |`;
  const divider = `| ${Array.from({ length: width }, (_, index) => align[index] === 'center' ? ':---:' : align[index] === 'right' ? '---:' : align[index] === 'left' ? ':---' : '---').join(' | ')} |`;
  return [line(rows[0].children), divider, ...rows.slice(1).map((row) => line(row.children))].join('\n');
}

/** Renders the flat scalar/array YAML subset accepted by Nizel frontmatter. */
function renderYaml(value: Record<string, unknown>): string {
  return Object.entries(value).flatMap(([key, item]) => {
    if (Array.isArray(item)) return [`${key}:`, ...item.map((entry) => `  - ${yamlScalar(entry)}`)];
    return [`${key}: ${yamlScalar(item)}`];
  }).join('\n');
}

/** Renders a YAML scalar, quoting values that could change type or syntax. */
function yamlScalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const text = String(value);
  return text === '' || /^[-?:,[\]{}#&*!|>'"%@`]|[:#]\s|\s$|^(true|false|null|-?\d+(\.\d+)?)$/i.test(text) ? JSON.stringify(text) : text;
}

/** Chooses a safe delimiter and padding for an inline code span. */
function renderCodeSpan(code: string): string {
  const fence = '`'.repeat(Math.max(1, longestRun(code, '`') + 1));
  const padding = code.startsWith('`') || code.endsWith('`') ? ' ' : '';
  return `${fence}${padding}${code}${padding}${fence}`;
}

/** Returns the longest consecutive run of one delimiter character. */
function longestRun(value: string, character: string): number {
  return Math.max(0, ...Array.from(value.matchAll(new RegExp(`\\${character}+`, 'g')), (match) => match[0].length));
}

/** Prefixes every line while preserving an empty blockquote line. */
function prefixLines(value: string, prefix: string): string { return value.split('\n').map((line) => line ? `${prefix}${line}` : prefix.trimEnd()).join('\n'); }
/** Escapes Markdown punctuation in ordinary text nodes. */
function escapeText(value: string): string { return value.replace(/([\\`*_[\]<>])/g, '\\$1'); }
/** Escapes delimiters inside link and image labels. */
function escapeLabel(value: string): string { return value.replace(/([\\\]])/g, '\\$1'); }
/** Encodes destination characters that would close or split a destination. */
function escapeDestination(value: string): string { return value.replaceAll(' ', '%20').replaceAll(')', '%29'); }
/** Escapes table separators and normalizes cell line breaks. */
function escapeTable(value: string): string { return value.replaceAll('|', '\\|').replaceAll('\n', '<br>'); }

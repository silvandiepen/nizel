import { getIcon } from 'open-icon/static';
import type { NizelBlockNode, NizelInlineNode, NizelOptions, NizelPlugin, NizelRootNode } from 'nizel';
import { findOpenIconExpressionEnd, parseOpenIconExpression } from './parseOpenIconExpression.js';
import { renderInlineSvg } from './renderInlineSvg.js';
import { renderMissingOpenIcon, renderSemantic } from './renderSemantic.js';
import { resolveOpenIcon } from './resolveOpenIcon.js';
import type {
  NormalizedOpenIconPluginOptions,
  OpenIconMetadata,
  OpenIconPluginOptions,
  OpenIconUsage,
  ParsedOpenIconExpression,
} from './types.js';

const ESCAPED_OPEN_ICON_SENTINEL = '\uE000nizel-open-icon-escaped';

export const openIconPluginMeta = {
  id: 'open-icon',
  label: 'Open Icon',
  description: 'Render Open Icon SVGs in Markdown.',
  category: 'Visual',
  defaultEnabled: false,
} as const;

export const openIconPlugin = (options: OpenIconPluginOptions = {}): NizelPlugin => {
  const normalized = normalizeOptions(options);
  const metadata: OpenIconMetadata['openIcon'] = { icons: [] };

  return {
    name: openIconPluginMeta.id,
    options: normalized.collectMetadata ? { meta: { openIcon: metadata } } : undefined,
    hooks: {
      beforeParse(markdown) {
        metadata.icons = [];
        return protectRawHtmlOpenIcon(markdown)
          .replace(/\\:open-icon\(/g, `${ESCAPED_OPEN_ICON_SENTINEL}(`);
      },
      afterParse(ast, resolvedOptions) {
        return transformOpenIcons(ast, normalized, metadata.icons, resolvedOptions);
      },
    },
  };
};

export const transformOpenIcons = (
  ast: NizelRootNode,
  options: NormalizedOpenIconPluginOptions,
  usage: OpenIconUsage[] = [],
  resolvedOptions?: NizelOptions,
): NizelRootNode => {
  return { ...ast, children: ast.children.map((node) => transformBlock(node, options, usage, resolvedOptions)) };
};

const normalizeOptions = (options: OpenIconPluginOptions): NormalizedOpenIconPluginOptions => ({
  mode: options.mode ?? 'inline-svg',
  className: options.className ?? 'nizel-open-icon',
  defaultSize: options.defaultSize ?? '1em',
  defaultColor: options.defaultColor,
  aliases: options.aliases ?? {},
  validateIcons: options.validateIcons ?? true,
  collectMetadata: options.collectMetadata ?? true,
  strict: options.strict ?? false,
});

const transformBlock = (
  node: NizelBlockNode,
  options: NormalizedOpenIconPluginOptions,
  usage: OpenIconUsage[],
  resolvedOptions?: NizelOptions,
): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return { ...node, children: transformInlineNodes(node.children, options, usage, resolvedOptions) } as NizelBlockNode;
  }
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, options, usage, resolvedOptions)) };
  if (node.type === 'list') {
    return {
      ...node,
      children: node.children.map((item) => ({
        ...item,
        children: item.children.map((child) => transformBlock(child, options, usage, resolvedOptions)),
      })),
    };
  }
  if (node.type === 'table') {
    return {
      ...node,
      children: node.children.map((row) => ({
        ...row,
        children: row.children.map((cell) => ({ ...cell, children: transformInlineNodes(cell.children, options, usage, resolvedOptions) })),
      })),
    };
  }
  if (node.type === 'customBlock') return { ...node, children: node.children?.map((child) => transformBlock(child, options, usage, resolvedOptions)) };
  return node;
};

const transformInlineNodes = (
  nodes: NizelInlineNode[],
  options: NormalizedOpenIconPluginOptions,
  usage: OpenIconUsage[],
  resolvedOptions?: NizelOptions,
): NizelInlineNode[] => {
  const transformed: NizelInlineNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') transformed.push(...transformText(node.value, options, usage, resolvedOptions));
    else if ('children' in node) transformed.push({ ...node, children: transformInlineNodes(node.children, options, usage, resolvedOptions) } as NizelInlineNode);
    else transformed.push(node);
  }
  return transformed;
};

const transformText = (
  value: string,
  options: NormalizedOpenIconPluginOptions,
  usage: OpenIconUsage[],
  resolvedOptions?: NizelOptions,
): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf(':open-icon(', cursor);
    if (start === -1) break;
    const end = findOpenIconExpressionEnd(value, start);
    if (end === -1) break;

    if (start > cursor) nodes.push({ type: 'text', value: restoreEscapedSyntax(value.slice(cursor, start)) });
    const source = value.slice(start, end);
    const parsed = parseOpenIconExpression(source);
    if (!parsed) {
      nodes.push({ type: 'text', value: source });
    } else {
      nodes.push({ type: 'inlineHtml', value: renderParsedOpenIcon(parsed, options, usage, resolvedOptions) });
    }
    cursor = end;
  }

  if (cursor < value.length) nodes.push({ type: 'text', value: restoreEscapedSyntax(value.slice(cursor)) });
  if (nodes.length === 0) nodes.push({ type: 'text', value: restoreEscapedSyntax(value) });
  return nodes;
};

const renderParsedOpenIcon = (
  parsed: ParsedOpenIconExpression,
  options: NormalizedOpenIconPluginOptions,
  usage: OpenIconUsage[],
  resolvedOptions?: NizelOptions,
): string => {
  const resolved = resolveOpenIcon(parsed.name, options.aliases);
  const markdownOptions = {
    ...parsed.options,
    color: parsed.options.color ?? options.defaultColor,
  };

  const collect = options.collectMetadata !== false;
  if (collect) {
    usage.push(cleanUsage({
      name: resolved.name,
      original: resolved.original,
      label: parsed.options.label,
      options: usageOptions(parsed.options, options.defaultSize),
    }));
    syncResolvedMetadata(resolvedOptions, usage);
  }

  if (resolved.error) return handleMissingIcon(resolved.name, parsed.options, options, resolved.error);

  const svg = getIcon(resolved.name);
  if ((options.validateIcons || options.mode === 'inline-svg') && !svg) {
    return handleMissingIcon(resolved.name, parsed.options, options, `Open Icon not found: ${resolved.name}`);
  }

  const input = {
    name: resolved.name,
    original: resolved.original,
    className: options.className,
    defaultSize: options.defaultSize,
    options: markdownOptions,
  };

  if (options.mode === 'semantic') return renderSemantic(input);
  return renderInlineSvg({ ...input, svg: svg ?? '' });
};

const handleMissingIcon = (
  name: string,
  markdownOptions: ParsedOpenIconExpression['options'],
  options: NormalizedOpenIconPluginOptions,
  message: string,
): string => {
  if (options.strict) throw new Error(`[nizel-plugin-open-icon] ${message}`);
  return renderMissingOpenIcon({
    name,
    className: options.className,
    defaultSize: options.defaultSize,
    options: markdownOptions,
  });
};

const usageOptions = (
  options: ParsedOpenIconExpression['options'],
  defaultSize: string | number,
): Record<string, string | number | boolean> => {
  const entries = Object.entries(options)
    .filter(([key, value]) => key !== 'label' && value !== undefined && !(key === 'size' && String(value) === String(defaultSize)));
  return Object.fromEntries(entries) as Record<string, string | number | boolean>;
};

const syncResolvedMetadata = (resolvedOptions: NizelOptions | undefined, icons: OpenIconUsage[]): void => {
  const meta = resolvedOptions?.meta as Partial<OpenIconMetadata> | undefined;
  if (!meta) return;
  meta.openIcon = { icons };
};

const cleanUsage = (usage: OpenIconUsage): OpenIconUsage => {
  const cleaned: OpenIconUsage = {
    name: usage.name,
    options: usage.options,
  };
  if (usage.original !== undefined) cleaned.original = usage.original;
  if (usage.label !== undefined) cleaned.label = usage.label;
  return cleaned;
};

const protectRawHtmlOpenIcon = (markdown: string): string => {
  return markdown.replace(/<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, (html) => {
    return html.replace(/:open-icon\(/g, `${ESCAPED_OPEN_ICON_SENTINEL}(`);
  });
};

const restoreEscapedSyntax = (value: string): string => value.replaceAll(`${ESCAPED_OPEN_ICON_SENTINEL}(`, ':open-icon(');

export default openIconPlugin;

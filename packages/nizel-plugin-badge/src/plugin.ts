import type { NizelBlockNode, NizelInlineNode, NizelOptions, NizelPlugin, NizelRootNode } from 'nizel';
import { escapeAttribute, escapeHtml } from './escape.js';
import { findBadgeExpressionEnd, parseBadgeExpression } from './parseBadgeExpression.js';
import type {
  BadgeMetadata,
  BadgePluginOptions,
  BadgeTone,
  BadgeUsage,
  NormalizedBadgePluginOptions,
  ParsedBadgeExpression,
} from './types.js';

const ESCAPED_BADGE_SENTINEL = '\uE000nizel-badge-escaped';

export const badgePluginMeta = {
  id: 'badge',
  label: 'Badge',
  description: 'Renders inline badges and status labels in Markdown.',
  category: 'Inline',
  defaultEnabled: false,
} as const;

export const BADGE_TONES: BadgeTone[] = [
  'neutral',
  'info',
  'success',
  'warning',
  'danger',
  'purple',
  'blue',
  'green',
  'yellow',
  'red',
];

export const badgePlugin = (options: BadgePluginOptions = {}): NizelPlugin => {
  const normalized = normalizeOptions(options);
  const metadata: BadgeMetadata['badge'] = { badges: [] };

  return {
    name: badgePluginMeta.id,
    options: normalized.collectMetadata ? { meta: { badge: metadata } } : undefined,
    hooks: {
      beforeParse(markdown) {
        metadata.badges = [];
        return protectRawHtmlBadge(markdown).replace(/\\:badge\(/g, `${ESCAPED_BADGE_SENTINEL}(`);
      },
      afterParse(ast, resolvedOptions) {
        return transformBadges(ast, normalized, metadata.badges, resolvedOptions);
      },
    },
  };
};

export const transformBadges = (
  ast: NizelRootNode,
  options: NormalizedBadgePluginOptions,
  usage: BadgeUsage[] = [],
  resolvedOptions?: NizelOptions,
): NizelRootNode => {
  return { ...ast, children: ast.children.map((node) => transformBlock(node, options, usage, resolvedOptions)) };
};

const normalizeOptions = (options: BadgePluginOptions): NormalizedBadgePluginOptions => ({
  className: options.className ?? 'nizel-badge',
  defaultTone: options.defaultTone ?? 'neutral',
  allowedTones: options.allowedTones ?? BADGE_TONES,
  collectMetadata: options.collectMetadata ?? true,
  aliases: options.aliases ?? {},
});

const transformBlock = (
  node: NizelBlockNode,
  options: NormalizedBadgePluginOptions,
  usage: BadgeUsage[],
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
  options: NormalizedBadgePluginOptions,
  usage: BadgeUsage[],
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
  options: NormalizedBadgePluginOptions,
  usage: BadgeUsage[],
  resolvedOptions?: NizelOptions,
): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf(':badge(', cursor);
    if (start === -1) break;
    const end = findBadgeExpressionEnd(value, start);
    if (end === -1) break;

    if (start > cursor) nodes.push({ type: 'text', value: restoreEscapedSyntax(value.slice(cursor, start)) });
    const source = value.slice(start, end);
    const parsed = parseBadgeExpression(source);
    if (!parsed) {
      nodes.push({ type: 'text', value: restoreEscapedSyntax(source) });
    } else {
      nodes.push({ type: 'inlineHtml', value: renderParsedBadge(parsed, options, usage, resolvedOptions) });
    }
    cursor = end;
  }

  if (cursor < value.length) nodes.push({ type: 'text', value: restoreEscapedSyntax(value.slice(cursor)) });
  if (nodes.length === 0) nodes.push({ type: 'text', value: restoreEscapedSyntax(value) });
  return nodes;
};

const renderParsedBadge = (
  parsed: ParsedBadgeExpression,
  options: NormalizedBadgePluginOptions,
  usage: BadgeUsage[],
  resolvedOptions?: NizelOptions,
): string => {
  const alias = options.aliases[parsed.label];
  const label = alias?.label ?? parsed.label;
  const tone = resolveTone(parsed.options.tone ?? alias?.tone, options);
  const className = parsed.options.className ? `${options.className} ${parsed.options.className}` : options.className;
  const title = parsed.options.title;

  if (options.collectMetadata) {
    usage.push(cleanUsage({
      label,
      tone,
      original: alias ? parsed.label : undefined,
      title,
    }));
    syncResolvedMetadata(resolvedOptions, usage);
  }

  const titleAttribute = title === undefined ? '' : ` title="${escapeAttribute(title)}"`;
  return `<span class="${escapeAttribute(className)}" data-tone="${escapeAttribute(tone)}"${titleAttribute}>${escapeHtml(label)}</span>`;
};

const resolveTone = (tone: string | undefined, options: NormalizedBadgePluginOptions): BadgeTone => {
  if (tone && options.allowedTones.includes(tone as BadgeTone)) return tone as BadgeTone;
  if (options.allowedTones.includes(options.defaultTone)) return options.defaultTone;
  return 'neutral';
};

const syncResolvedMetadata = (resolvedOptions: NizelOptions | undefined, badges: BadgeUsage[]): void => {
  const meta = resolvedOptions?.meta as Partial<BadgeMetadata> | undefined;
  if (!meta) return;
  meta.badge = { badges };
};

const cleanUsage = (usage: BadgeUsage): BadgeUsage => {
  const cleaned: BadgeUsage = {
    label: usage.label,
    tone: usage.tone,
  };
  if (usage.original !== undefined) cleaned.original = usage.original;
  if (usage.title !== undefined) cleaned.title = usage.title;
  return cleaned;
};

const protectRawHtmlBadge = (markdown: string): string => {
  return markdown.replace(/<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, (html) => {
    return html.replace(/:badge\(/g, `${ESCAPED_BADGE_SENTINEL}(`);
  });
};

const restoreEscapedSyntax = (value: string): string => value.replaceAll(`${ESCAPED_BADGE_SENTINEL}(`, ':badge(');

export default badgePlugin;

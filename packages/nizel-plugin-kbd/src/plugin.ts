import type { NizelBlockNode, NizelInlineNode, NizelOptions, NizelPlugin, NizelRootNode } from 'nizel';
import { escapeHtml } from './escape.js';
import type {
  KbdMetadata,
  KbdPlatform,
  KbdPluginOptions,
  KbdShortcutUsage,
  NormalizedKbdPluginOptions,
} from './types.js';

const ESCAPED_KBD_SENTINEL = '\uE000nizel-kbd-escaped';

export const kbdPluginMeta = {
  id: 'kbd',
  label: 'Keyboard Shortcuts',
  description: 'Renders keyboard shortcuts in Markdown.',
  category: 'Inline',
  defaultEnabled: false,
} as const;

export const kbdPlugin = (options: KbdPluginOptions = {}): NizelPlugin => {
  const normalized = normalizeOptions(options);
  const metadata: KbdMetadata['kbd'] = { shortcuts: [] };

  return {
    name: kbdPluginMeta.id,
    options: normalized.collectMetadata ? { meta: { kbd: metadata } } : undefined,
    hooks: {
      beforeParse(markdown) {
        metadata.shortcuts = [];
        return protectRawHtmlKbd(markdown).replace(/\\:kbd\(/g, `${ESCAPED_KBD_SENTINEL}(`);
      },
      afterParse(ast, resolvedOptions) {
        return transformKbdShortcuts(ast, normalized, metadata.shortcuts, resolvedOptions);
      },
    },
  };
};

export const transformKbdShortcuts = (
  ast: NizelRootNode,
  options: NormalizedKbdPluginOptions,
  shortcuts: KbdShortcutUsage[] = [],
  resolvedOptions?: NizelOptions,
): NizelRootNode => {
  return { ...ast, children: ast.children.map((node) => transformBlock(node, options, shortcuts, resolvedOptions)) };
};

export const normalizeKbdShortcut = (
  value: string,
  options: Pick<NormalizedKbdPluginOptions, 'platform' | 'aliases'>,
): KbdShortcutUsage => {
  const aliasResolved = options.aliases[value] ?? value;
  const keys = aliasResolved
    .split('+')
    .map((key) => normalizeKey(key.trim(), options.platform))
    .filter(Boolean);
  const resolved = keys.join('+');

  return {
    original: value,
    resolved,
    keys,
  };
};

const normalizeOptions = (options: KbdPluginOptions): NormalizedKbdPluginOptions => ({
  platform: options.platform ?? 'auto',
  className: options.className ?? 'nizel-kbd',
  separatorClassName: options.separatorClassName ?? 'nizel-kbd-separator',
  groupClassName: options.groupClassName ?? 'nizel-kbd-group',
  collectMetadata: options.collectMetadata ?? true,
  aliases: options.aliases ?? {},
});

const transformBlock = (
  node: NizelBlockNode,
  options: NormalizedKbdPluginOptions,
  shortcuts: KbdShortcutUsage[],
  resolvedOptions?: NizelOptions,
): NizelBlockNode => {
  if (node.type === 'paragraph' || node.type === 'heading') {
    return { ...node, children: transformInlineNodes(node.children, options, shortcuts, resolvedOptions) } as NizelBlockNode;
  }
  if (node.type === 'blockquote') return { ...node, children: node.children.map((child) => transformBlock(child, options, shortcuts, resolvedOptions)) };
  if (node.type === 'list') {
    return {
      ...node,
      children: node.children.map((item) => ({
        ...item,
        children: item.children.map((child) => transformBlock(child, options, shortcuts, resolvedOptions)),
      })),
    };
  }
  if (node.type === 'table') {
    return {
      ...node,
      children: node.children.map((row) => ({
        ...row,
        children: row.children.map((cell) => ({ ...cell, children: transformInlineNodes(cell.children, options, shortcuts, resolvedOptions) })),
      })),
    };
  }
  if (node.type === 'customBlock') return { ...node, children: node.children?.map((child) => transformBlock(child, options, shortcuts, resolvedOptions)) };
  return node;
};

const transformInlineNodes = (
  nodes: NizelInlineNode[],
  options: NormalizedKbdPluginOptions,
  shortcuts: KbdShortcutUsage[],
  resolvedOptions?: NizelOptions,
): NizelInlineNode[] => {
  const transformed: NizelInlineNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text') transformed.push(...transformText(node.value, options, shortcuts, resolvedOptions));
    else if ('children' in node) transformed.push({ ...node, children: transformInlineNodes(node.children, options, shortcuts, resolvedOptions) } as NizelInlineNode);
    else transformed.push(node);
  }
  return transformed;
};

const transformText = (
  value: string,
  options: NormalizedKbdPluginOptions,
  shortcuts: KbdShortcutUsage[],
  resolvedOptions?: NizelOptions,
): NizelInlineNode[] => {
  const nodes: NizelInlineNode[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf(':kbd(', cursor);
    if (start === -1) break;
    const end = value.indexOf(')', start + 5);
    if (end === -1) break;

    if (start > cursor) nodes.push({ type: 'text', value: restoreEscapedSyntax(value.slice(cursor, start)) });
    const original = value.slice(start + 5, end);
    const usage = normalizeKbdShortcut(original, options);
    if (options.collectMetadata) {
      shortcuts.push(usage);
      syncResolvedMetadata(resolvedOptions, shortcuts);
    }
    nodes.push({ type: 'inlineHtml', value: renderShortcut(usage, options) });
    cursor = end + 1;
  }

  if (cursor < value.length) nodes.push({ type: 'text', value: restoreEscapedSyntax(value.slice(cursor)) });
  if (nodes.length === 0) nodes.push({ type: 'text', value: restoreEscapedSyntax(value) });
  return nodes;
};

const renderShortcut = (usage: KbdShortcutUsage, options: NormalizedKbdPluginOptions): string => {
  const keys = usage.keys.map((key) => `<kbd class="${escapeHtml(options.className)}">${escapeHtml(key)}</kbd>`);
  const separator = `<span class="${escapeHtml(options.separatorClassName)}" aria-hidden="true">+</span>`;
  return `<span class="${escapeHtml(options.groupClassName)}" data-shortcut="${escapeHtml(usage.resolved)}">${keys.join(separator)}</span>`;
};

const normalizeKey = (key: string, platform: KbdPlatform): string => {
  if (!key) return '';
  const lookup = KEY_NORMALIZATIONS[key.toLowerCase()];
  const normalized = lookup ?? normalizeLetterKey(key);
  if (normalized === 'Mod') return platform === 'macos' ? 'Cmd' : 'Ctrl';
  return normalized;
};

const normalizeLetterKey = (key: string): string => {
  return /^[a-z]$/.test(key) ? key.toUpperCase() : key;
};

const syncResolvedMetadata = (resolvedOptions: NizelOptions | undefined, shortcuts: KbdShortcutUsage[]): void => {
  const meta = resolvedOptions?.meta as Partial<KbdMetadata> | undefined;
  if (!meta) return;
  meta.kbd = { shortcuts };
};

const protectRawHtmlKbd = (markdown: string): string => {
  return markdown.replace(/<([A-Za-z][A-Za-z0-9-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g, (html) => {
    return html.replace(/:kbd\(/g, `${ESCAPED_KBD_SENTINEL}(`);
  });
};

const restoreEscapedSyntax = (value: string): string => value.replaceAll(`${ESCAPED_KBD_SENTINEL}(`, ':kbd(');

const KEY_NORMALIZATIONS: Record<string, string> = {
  command: 'Cmd',
  cmd: 'Cmd',
  control: 'Ctrl',
  ctrl: 'Ctrl',
  option: 'Opt',
  opt: 'Opt',
  alt: 'Alt',
  escape: 'Esc',
  esc: 'Esc',
  return: 'Enter',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Del',
  del: 'Del',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  space: 'Space',
  tab: 'Tab',
  shift: 'Shift',
  capslock: 'Caps Lock',
  mod: 'Mod',
};

export default kbdPlugin;

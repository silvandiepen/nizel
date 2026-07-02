import type { NizelBlockDefinition, NizelPlugin } from 'nizel';

export type FrontmatterUiPluginOptions = {
  className?: string;
};

export const frontmatterUiPlugin = (options: FrontmatterUiPluginOptions = {}): NizelPlugin => ({
  name: 'frontmatter-ui',
  blocks: {
    frontmatter: frontmatterBlock(options),
  },
});

export const renderFrontmatterMeta = (
  meta: Record<string, unknown>,
  options: FrontmatterUiPluginOptions = {},
): string => {
  const rows = Object.entries(meta)
    .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(formatValue(value))}</dd>`)
    .join('');
  return `<dl class="${escapeHtml(options.className ?? 'frontmatter')}">${rows}</dl>`;
};

const frontmatterBlock = (options: FrontmatterUiPluginOptions): NizelBlockDefinition => ({
  name: 'frontmatter',
  parse({ content, props }) {
    const contentMeta = Object.fromEntries(content.split('\n').filter(Boolean).map((line) => {
      const [key, ...value] = line.split(':');
      return [key.trim(), value.join(':').trim()];
    }));
    const meta = { ...props, ...contentMeta };
    return { meta };
  },
  formats: {
    html(node) {
      if (node.type !== 'customBlock') return '';
      return renderFrontmatterMeta((node.value as { meta?: Record<string, unknown> } | undefined)?.meta ?? {}, options);
    },
  },
});

const formatValue = (value: unknown): string => Array.isArray(value) ? value.join(', ') : String(value);
const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default frontmatterUiPlugin;

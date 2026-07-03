import type { NizelBlockDefinition, NizelHtmlToMarkdownHandler, NizelPlugin, NizelRenderContext } from 'nizel';
import { findHtmlElement, hasHtmlClass } from 'nizel';

export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution';

export type AlertPluginOptions = {
  className?: string;
};

type AlertValue = {
  alertType: AlertType;
  title: string;
};

const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;

/**
 * Creates a GitHub-style alert block plugin.
 */
export const alertPlugin = (options: AlertPluginOptions = {}): NizelPlugin => {
  const blocks = Object.fromEntries(
    ALERT_TYPES.map((alertType) => [alertType, createAlertBlock(alertType, options)]),
  ) as Record<AlertType, NizelBlockDefinition>;

  return {
    name: 'alert',
    blocks,
    hooks: {
      beforeParse: transformGitHubAlerts,
    },
    htmlToMarkdown: alertToMarkdown(options),
  };
};

/**
 * Converts rendered alert HTML back into `::type title` custom blocks.
 */
export const alertToMarkdown = (options: AlertPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const rootClass = options.className ?? 'alert';
  return (node, ctx) => {
    if (node.type !== 'element' || node.tag !== 'div') return undefined;
    const type = node.attrs['data-alert'];
    if (!type) return undefined;

    const titleEl = findHtmlElement(node, (el) => el.tag === 'p' && hasHtmlClass(el, `${rootClass}__title`));
    const contentEl = findHtmlElement(node, (el) => hasHtmlClass(el, `${rootClass}__content`));
    const title = titleEl ? ctx.text(titleEl).trim() : '';
    const body = contentEl ? ctx.block(contentEl) : '';

    return `${title ? `::${type} ${title}` : `::${type}`}\n${body}\n::`;
  };
};

/**
 * Converts GitHub alert blockquotes to Nizel alert custom blocks.
 */
export const transformGitHubAlerts = (markdown: string): string => {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const opener = /^ {0,3}> ?\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i.exec(lines[index]);
    if (!opener) {
      result.push(lines[index]);
      index += 1;
      continue;
    }

    const alertType = opener[1].toLowerCase() as AlertType;
    const content: string[] = [];
    index += 1;

    while (index < lines.length) {
      const quoteLine = /^ {0,3}> ?(.*)$/.exec(lines[index]);
      if (!quoteLine) break;
      content.push(quoteLine[1]);
      index += 1;
    }

    result.push(`::${alertType} ${alertTitle(alertType)}`);
    result.push(...trimAlertContent(content));
    result.push('::');
  }

  return result.join('\n');
};

/**
 * Creates a custom block definition for one alert type.
 */
const createAlertBlock = (
  alertType: AlertType,
  options: AlertPluginOptions,
): NizelBlockDefinition => {
  return {
    name: alertType,
    parse({ args, props }): AlertValue {
      const title = props.title ?? args[0] ?? '';
      return { alertType, title: String(title) };
    },
    formats: {
      html(node, ctx) {
        if (node.type !== 'customBlock' || !isAlertValue(node.value)) return '';
        return renderAlert(node.value, node.children ?? [], ctx, options);
      },
    },
  };
};

/**
 * Renders an alert block with escaped attributes and title text.
 */
const renderAlert = (
  value: AlertValue,
  children: NonNullable<Extract<Parameters<NizelRenderContext['render']>[0], unknown[]>>,
  ctx: NizelRenderContext,
  options: AlertPluginOptions,
): string => {
  const rootClass = options.className ?? 'alert';
  const titleHtml = value.title ? `<p class="${rootClass}__title">${ctx.escape(value.title)}</p>` : '';
  const contentHtml = ctx.render(children);
  const escapedType = ctx.escape(value.alertType);

  return `<div class="${ctx.escape(rootClass)} ${ctx.escape(rootClass)}--${escapedType}" data-alert="${escapedType}">${titleHtml}<div class="${ctx.escape(rootClass)}__content">${contentHtml}</div></div>`;
};

/**
 * Trims structural blank lines from transformed alert content.
 */
const trimAlertContent = (lines: string[]): string[] => {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  return lines.slice(start, end);
};

/**
 * Formats an alert type as a default title.
 */
const alertTitle = (alertType: AlertType): string => {
  return alertType.charAt(0).toUpperCase() + alertType.slice(1);
};

/**
 * Checks that a custom block value was produced by the alert parser.
 */
const isAlertValue = (value: unknown): value is AlertValue => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AlertValue>;
  return typeof candidate.title === 'string' && ALERT_TYPES.includes(candidate.alertType as AlertType);
};

export default alertPlugin;

import {
  defineNizelPlugin,
  type NizelBlockDefinition,
  type NizelPlugin,
  type NizelRenderContext,
} from 'nizel';

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

  return defineNizelPlugin({
    name: 'alert',
    blocks,
  });
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
 * Checks that a custom block value was produced by the alert parser.
 */
const isAlertValue = (value: unknown): value is AlertValue => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AlertValue>;
  return typeof candidate.title === 'string' && ALERT_TYPES.includes(candidate.alertType as AlertType);
};

export default alertPlugin;

import { defineNizelPlugin } from 'nizel';

/**
 * Alert types supported by GitHub-style alert blocks.
 */
const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'];

/**
 * Creates a GitHub-style alert blocks plugin.
 *
 * Supported syntax in markdown:
 *   ::tip My Title
 *   Content here with **markdown**.
 *   ::
 *
 * Or with props:
 *   ::tip
 *   title: My Title
 *   ::
 *   Content here.
 *   ::
 */
export function alertPlugin() {
  const blocks = {};

  for (const alertType of ALERT_TYPES) {
    blocks[alertType] = {
      name: alertType,
      parse({ args, props }) {
        const title = props.title ?? args[0] ?? '';
        return { alertType, title: String(title) };
      },
      formats: {
        html(node, ctx) {
          const { alertType, title } = node.value;
          const titleHtml = title
            ? `<p class="alert__title">${ctx.escape(title)}</p>`
            : '';
          const contentHtml = ctx.render(node.children);
          return `<div class="alert alert--${ctx.escape(alertType)}" data-alert="${ctx.escape(alertType)}">${titleHtml}<div class="alert__content">${contentHtml}</div></div>`;
        },
      },
    };
  }

  return defineNizelPlugin({
    name: 'alert',
    blocks,
  });
}

export default alertPlugin;

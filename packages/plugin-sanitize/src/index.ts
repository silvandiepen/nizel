import type { NizelPlugin } from 'nizel';

export type SanitizePluginOptions = {
  allowRawHtml?: boolean;
};

/**
 * Sanitizes rendered HTML for native app and WebView usage.
 */
export const sanitizePlugin = (options: SanitizePluginOptions = {}): NizelPlugin => ({
  name: 'sanitize',
  options: {
    safe: options.allowRawHtml === true ? false : true,
  },
  hooks: {
    afterRender(html) {
      return sanitizeHtml(html);
    },
  },
});

export const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]+/gi, '');
};

export default sanitizePlugin;

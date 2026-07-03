export const escapeHtml = (value: unknown): string => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const escapeAttribute = escapeHtml;

export const escapeCssValue = (value: unknown): string => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/</g, '\\3C ')
  .replace(/>/g, '\\3E ')
  .replace(/\n/g, ' ');


import type { NizelHtmlToMarkdownHandler, NizelPlugin } from 'nizel';
import { findHtmlElement } from 'nizel';

export type MediaPluginOptions = {
  lazy?: boolean;
  responsive?: boolean;
  figureClassName?: string;
};

export const mediaPlugin = (options: MediaPluginOptions = {}): NizelPlugin => ({
  name: 'media',
  hooks: {
    afterRender(html) {
      return enhanceImages(html, options);
    },
  },
  htmlToMarkdown: mediaToMarkdown(options),
});

/**
 * Converts rendered media figures back into standalone image Markdown.
 */
export const mediaToMarkdown = (options: MediaPluginOptions = {}): NizelHtmlToMarkdownHandler => {
  const className = options.figureClassName ?? 'media-figure';
  return (node, ctx) => {
    if (node.type !== 'element' || node.tag !== 'figure' || node.attrs.class !== className) return undefined;
    const img = findHtmlElement(node, (el) => el.tag === 'img');
    if (!img) return undefined;
    const attrs: Record<string, string> = { src: img.attrs.src ?? '' };
    if (img.attrs.alt !== undefined) attrs.alt = img.attrs.alt;
    if (img.attrs.title !== undefined) attrs.title = img.attrs.title;
    const cleanImg = { type: 'element' as const, tag: 'img', attrs, children: [], raw: '' };
    return ctx.inline({ type: 'root', children: [cleanImg] });
  };
};

export const enhanceImages = (html: string, options: MediaPluginOptions = {}): string => {
  const lazy = options.lazy !== false;
  const responsive = options.responsive !== false;
  const className = options.figureClassName ?? 'media-figure';

  return html.replace(/<p>(<img\b[^>]*>)<\/p>/g, (_match, img: string) => {
    const enhanced = enhanceImageTag(img, { lazy, responsive });
    const caption = /alt="([^"]+)"/.exec(enhanced)?.[1];
    return `<figure class="${escapeHtml(className)}">${enhanced}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
  });
};

const enhanceImageTag = (img: string, options: { lazy: boolean; responsive: boolean }): string => {
  let next = img;
  if (options.lazy && !/\sloading=/.test(next)) next = next.replace(/\/?>$/, ' loading="lazy" />');
  if (options.responsive && !/\sdecoding=/.test(next)) next = next.replace(/\/?>$/, ' decoding="async" />');
  return next;
};

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default mediaPlugin;

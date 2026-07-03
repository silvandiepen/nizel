import { escapeAttribute, escapeCssValue } from './escape.js';
import type { OpenIconMarkdownOptions } from './types.js';

export const transformOpenIconSvg = (svg: string, options: OpenIconMarkdownOptions): string => {
  const safeSvg = svg.replace(/\s+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, '');
  const attrs: string[] = [];
  if (options.size !== undefined) {
    const size = escapeAttribute(options.size);
    attrs.push(`width="${size}"`, `height="${size}"`);
  }

  const style = svgStyle(options);
  if (style) attrs.push(`style="${style}"`);

  if (attrs.length === 0) return safeSvg;
  return safeSvg.replace(/<svg\b([^>]*)>/, (_match, existing: string) => `<svg${existing} ${attrs.join(' ')}>`);
};

export const svgStyle = (options: OpenIconMarkdownOptions): string => {
  const declarations: string[] = [];
  if (options.color !== undefined) declarations.push(`--icon-stroke-color: ${escapeCssValue(options.color)}`);
  if (options.fill !== undefined) declarations.push(`--icon-fill: ${escapeCssValue(options.fill)}`);
  if (options.fillSecondary !== undefined) declarations.push(`--icon-fill-secondary: ${escapeCssValue(options.fillSecondary)}`);
  if (options.stroke !== undefined) declarations.push(`--icon-stroke-color: ${escapeCssValue(options.stroke)}`);
  if (options.strokeSecondary !== undefined) declarations.push(`--icon-stroke-color-secondary: ${escapeCssValue(options.strokeSecondary)}`);
  if (options.opacity !== undefined) declarations.push(`--icon-fill-opacity: ${escapeCssValue(options.opacity)}`);
  if (options.strokeWidth !== undefined) declarations.push(`--icon-stroke-width: ${escapeCssValue(options.strokeWidth)}`);
  return declarations.join('; ');
};

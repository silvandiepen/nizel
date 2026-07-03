import { escapeAttribute } from './escape.js';
import type { OpenIconMarkdownOptions } from './types.js';

export type RenderOpenIconInput = {
  name: string;
  original?: string;
  className: string;
  defaultSize: string | number;
  options: OpenIconMarkdownOptions;
  missing?: boolean;
};

export const renderSemantic = (input: RenderOpenIconInput): string => {
  return `${renderOpenIconStart(input)}></span>`;
};

export const renderMissingOpenIcon = (input: RenderOpenIconInput): string => {
  return `${renderOpenIconStart({ ...input, missing: true })}></span>`;
};

export const renderOpenIconStart = ({
  name,
  className,
  defaultSize,
  options,
  missing = false,
}: RenderOpenIconInput): string => {
  const classes = [className, options.className, missing ? `${className}--missing` : undefined]
    .filter(Boolean)
    .join(' ');
  const attrs = [
    `class="${escapeAttribute(classes)}"`,
    `data-icon="${escapeAttribute(name)}"`,
    ...dataAttributes(options, defaultSize),
    ...accessibilityAttributes(options.label),
  ];
  return `<span ${attrs.join(' ')}`;
};

const accessibilityAttributes = (label?: string): string[] => label
  ? ['role="img"', `aria-label="${escapeAttribute(label)}"`]
  : ['aria-hidden="true"'];

const dataAttributes = (options: OpenIconMarkdownOptions, defaultSize: string | number): string[] => {
  const attrs: string[] = [];
  if (options.size !== undefined && String(options.size) !== String(defaultSize)) attrs.push(`data-size="${escapeAttribute(options.size)}"`);
  if (options.color !== undefined) attrs.push(`data-color="${escapeAttribute(options.color)}"`);
  if (options.fill !== undefined) attrs.push(`data-fill="${escapeAttribute(options.fill)}"`);
  if (options.fillSecondary !== undefined) attrs.push(`data-fill-secondary="${escapeAttribute(options.fillSecondary)}"`);
  if (options.stroke !== undefined) attrs.push(`data-stroke="${escapeAttribute(options.stroke)}"`);
  if (options.strokeSecondary !== undefined) attrs.push(`data-stroke-secondary="${escapeAttribute(options.strokeSecondary)}"`);
  if (options.opacity !== undefined) attrs.push(`data-opacity="${escapeAttribute(options.opacity)}"`);
  if (options.strokeWidth !== undefined) attrs.push(`data-stroke-width="${escapeAttribute(options.strokeWidth)}"`);
  return attrs;
};

import { renderOpenIconStart, type RenderOpenIconInput } from './renderSemantic.js';
import { transformOpenIconSvg } from './transformOpenIconSvg.js';

export const renderInlineSvg = (input: RenderOpenIconInput & { svg: string }): string => {
  const svg = transformOpenIconSvg(input.svg, input.options);
  return `${renderOpenIconStart(input)}>${svg}</span>`;
};

import { renderHtmlFromDocument } from '@comark/html';
import { createMarkdownParser } from 'comark';

export const name = 'comark';

/** Uses one initialized parser so setup cost is not charged to every operation. */
export const createComarkEngine = () => {
  const parse = createMarkdownParser({ autoClose: false });
  return {
    name,
    parse(markdown) {
      return parse(markdown);
    },
    async render(markdown) {
      return renderHtmlFromDocument(await parse(markdown));
    },
  };
};

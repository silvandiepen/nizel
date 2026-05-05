import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

export const name = 'remark';

export const createRemarkEngine = () => {
  const parser = unified().use(remarkParse).use(remarkGfm);
  const renderer = unified().use(remarkParse).use(remarkGfm).use(remarkHtml, { sanitize: false });

  return {
    name,
    async render(markdown) {
      return String(await renderer.process(markdown));
    },
    parse(markdown) {
      return parser.parse(markdown);
    },
  };
};


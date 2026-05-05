import MarkdownIt from 'markdown-it';

export const name = 'markdown-it';

export const createMarkdownItEngine = () => {
  const parser = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
  });

  return {
    name,
    render(markdown) {
      return parser.render(markdown);
    },
    parse(markdown) {
      return parser.parse(markdown, {});
    },
  };
};


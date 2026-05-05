import { marked } from 'marked';

export const name = 'marked';

export const createMarkedEngine = () => ({
  name,
  render(markdown) {
    return marked.parse(markdown, {
      async: false,
      breaks: false,
      gfm: true,
    });
  },
  parse(markdown) {
    return marked.lexer(markdown, {
      breaks: false,
      gfm: true,
    });
  },
});


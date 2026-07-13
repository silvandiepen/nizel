import type { NizelHtmlToMarkdownHandler, NizelPlugin } from 'nizel';

export type HiddenCommentsMode = 'hide' | 'small' | 'render' | 'remove';

export type HiddenCommentsPluginOptions = {
  mode?: HiddenCommentsMode;
  injectCss?: boolean;
  className?: string;
};

type NormalizedOptions = Required<HiddenCommentsPluginOptions>;

/**
 * Handles Markdown HTML comments as first-class renderable content.
 */
export const hiddenCommentsPlugin = (options: HiddenCommentsPluginOptions = {}): NizelPlugin => {
  const normalized = normalizeOptions(options);
  let comments = new Map<string, string>();
  let nextIndex = 0;

  return {
    name: 'hidden-comments',
    hooks: {
      beforeParse(markdown) {
        comments = new Map<string, string>();
        nextIndex = 0;
        return transformMarkdownComments(markdown, normalized, (comment) => {
          const token = `NIZEL_HIDDEN_COMMENT_${nextIndex}_${Math.random().toString(36).slice(2)}`;
          nextIndex += 1;
          comments.set(token, comment);
          return token;
        });
      },
      afterRender(html) {
        let nextHtml = restoreCommentTokens(html, comments, normalized);
        if (normalized.injectCss && normalized.mode !== 'remove') {
          nextHtml = `${hiddenCommentsStyleTag(normalized.className)}\n${nextHtml}`;
        }
        return nextHtml;
      },
    },
    htmlToMarkdown: hiddenCommentsToMarkdown(normalized),
  };
};

export const transformMarkdownComments = (
  markdown: string,
  options: HiddenCommentsPluginOptions = {},
  createToken: (comment: string) => string = (comment) => renderCommentElement(comment, normalizeOptions(options)),
): string => {
  const normalized = normalizeOptions(options);
  if (typeof markdown !== 'string' || markdown.indexOf('<!--') === -1) return markdown;

  return replaceMarkdownCommentsOutsideFences(markdown, (comment) => {
    if (normalized.mode === 'remove') return '';
    return createToken(comment);
  });
};

export const hiddenCommentsToMarkdown = (
  options: HiddenCommentsPluginOptions = {},
): NizelHtmlToMarkdownHandler => {
  const normalized = normalizeOptions(options);

  return (node, ctx) => {
    if (node.type !== 'element' || node.tag !== 'span') return undefined;
    if (!isHiddenCommentElement(node.attrs, normalized.className)) return undefined;

    const text = ctx.text(node).trim();
    if (/^<!--[\s\S]*-->$/.test(text)) return text;
    return `<!-- ${text.replace(/^<!--|-->$/g, '').trim()} -->`;
  };
};

const isHiddenCommentElement = (attrs: Record<string, string>, className: string): boolean => {
  if ('data-nizel-hidden-comment' in attrs) return true;
  return (attrs.class ?? '').split(/\s+/).includes(className);
};

const normalizeOptions = (options: HiddenCommentsPluginOptions): NormalizedOptions => ({
  mode: options.mode ?? 'hide',
  injectCss: options.injectCss ?? false,
  className: options.className ?? 'nizel-hidden-comment',
});

const replaceMarkdownCommentsOutsideFences = (
  markdown: string,
  replacer: (comment: string) => string,
): string => {
  const lines = markdown.split(/(\n)/);
  let result = '';
  let line = '';
  let fence: { marker: string; length: number } | undefined;

  for (const part of lines) {
    line += part;
    if (part !== '\n') continue;

    const next = processLine(line, fence, replacer);
    result += next.line;
    fence = next.fence;
    line = '';
  }

  if (line) {
    const next = processLine(line, fence, replacer);
    result += next.line;
  }

  return result;
};

const processLine = (
  line: string,
  fence: { marker: string; length: number } | undefined,
  replacer: (comment: string) => string,
): { line: string; fence: { marker: string; length: number } | undefined } => {
  if (fence) {
    return {
      line,
      fence: isClosingFenceLine(line, fence) ? undefined : fence,
    };
  }

  const openingFence = getOpeningFenceLine(line);
  if (openingFence) return { line, fence: openingFence };

  return {
    line: line.replace(/<!--[\s\S]*?-->/g, replacer),
    fence,
  };
};

const getOpeningFenceLine = (line: string): { marker: string; length: number } | undefined => {
  const match = /^( {0,3})(`{3,}|~{3,})/.exec(line);
  if (!match) return undefined;
  return { marker: match[2].charAt(0), length: match[2].length };
};

const isClosingFenceLine = (line: string, fence: { marker: string; length: number }): boolean => {
  const lineText = line.replace(/\r?\n$/, '');
  const escapedMarker = fence.marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^ {0,3}${escapedMarker}{${fence.length},} *$`);
  return pattern.test(lineText);
};

const renderCommentElement = (comment: string, options: NormalizedOptions): string => {
  const classes = [
    options.className,
    `${options.className}--${options.mode}`,
    'print-hidden-comment',
  ];
  const mode = escapeHtml(options.mode);
  return `<span class="${classes.map(escapeHtml).join(' ')}" data-nizel-hidden-comment="" data-hidden-comment-mode="${mode}">${escapeHtml(comment)}</span>`;
};

const restoreCommentTokens = (
  html: string,
  comments: Map<string, string>,
  options: NormalizedOptions,
): string => {
  if (!comments.size || options.mode === 'remove') return html;

  let nextHtml = html;
  for (const [token, comment] of comments) {
    const tokenPattern = new RegExp(escapeRegExp(token), 'g');
    const blockPattern = new RegExp(`<p>\\s*${escapeRegExp(token)}\\s*</p>`, 'g');
    const rendered = renderCommentElement(comment, options);
    nextHtml = nextHtml.replace(blockPattern, rendered).replace(tokenPattern, rendered);
  }
  return nextHtml;
};

const hiddenCommentsStyleTag = (className: string): string => {
  return `<style data-nizel-plugin="hidden-comments">${hiddenCommentsCss(className)}</style>`;
};

const hiddenCommentsCss = (className: string): string => {
  const selector = `.${className.replace(/[^A-Za-z0-9_-]/g, '')}`;
  return `${selector} {
  user-select: text;
}
${selector}--hide {
  border: 0;
  color: rgba(255, 255, 255, 0);
  display: inline-block;
  font-size: 1px;
  height: 0;
  line-height: 0;
  margin: 0;
  max-height: 0;
  max-width: 0;
  overflow: hidden;
  padding: 0;
  vertical-align: baseline;
  width: 0;
}
${selector}--small {
  color: color-mix(in srgb, currentColor 60%, transparent);
  display: inline;
  font-size: 0.75em;
  line-height: 1;
}
${selector}--render {
  display: inline;
}`;
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export default hiddenCommentsPlugin;

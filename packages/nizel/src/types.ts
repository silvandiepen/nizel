export type NizelOutput = 'html' | 'text' | 'ast';
export type NizelMissingValueMode = 'keep' | 'empty' | 'error';

export type NizelTemplateOptions = {
  missing?: NizelMissingValueMode;
  raw?: boolean;
  filters?: Record<string, NizelTemplateFilter>;
};

export type NizelTemplateFilter = (
  value: string,
  ...args: any[]
) => unknown;

export type NizelOptions<TMeta extends Record<string, unknown> = Record<string, unknown>> = {
  output?: NizelOutput;
  frontmatter?: boolean;
  template?: boolean | NizelTemplateOptions;
  toc?: boolean;
  anchors?: boolean;
  autolinks?: boolean | NizelAutolinkOptions;
  safe?: boolean;
  unwrapStandaloneImages?: boolean;
  elements?: NizelElementRules;
  blocks?: NizelBlockMap;
  inline?: Record<string, unknown>;
  transforms?: NizelTransform[];
  plugins?: NizelPlugin[];
  data?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  slugStyle?: 'github' | 'classic';
  preset?: NizelPresetName;
  meta?: TMeta;
};

export type NizelProcessor = {
  <TMeta extends Record<string, unknown> = Record<string, unknown>>(
    markdown: string,
    runtimeOptions?: NizelOptions<TMeta>,
  ): Promise<NizelResult<unknown, TMeta>>;
  html(markdown: string, runtimeOptions?: NizelOptions): Promise<string>;
  text(markdown: string, runtimeOptions?: NizelOptions): Promise<string>;
  ast(markdown: string, runtimeOptions?: NizelOptions): Promise<NizelRootNode>;
  meta<TMeta extends Record<string, unknown> = Record<string, unknown>>(
    markdown: string,
    runtimeOptions?: NizelOptions<TMeta>,
  ): Promise<TMeta>;
  preset(name: NizelPresetName): NizelProcessor;
  parse(markdown: string, runtimeOptions?: NizelOptions): Promise<NizelRootNode>;
  render(ast: NizelRootNode, runtimeOptions?: NizelOptions): string;
};

export type NizelUseNizel = {
  <TMeta extends Record<string, unknown> = Record<string, unknown>>(
    options?: NizelOptions<TMeta>,
  ): NizelProcessor;
  preset(name: NizelPresetName): NizelProcessor;
};

export type NizelResult<TOutput = string, TMeta = Record<string, unknown>> = {
  result: TOutput;
  html: string;
  text: string;
  ast: NizelRootNode;
  meta: TMeta;
  frontmatter: TMeta;
  title?: string;
  description?: string;
  excerpt?: string;
  toc: NizelTocItem[];
  headings: NizelHeading[];
  links: NizelLink[];
  images: NizelImage[];
  readingTime: {
    words: number;
    minutes: number;
  };
};

export type NizelRootNode = {
  type: 'root';
  children: NizelBlockNode[];
};

export type NizelBlockNode =
  | NizelParagraphNode
  | NizelHeadingNode
  | NizelCodeNode
  | NizelListNode
  | NizelBlockquoteNode
  | NizelThematicBreakNode
  | NizelTableNode
  | NizelHtmlNode
  | NizelCustomBlockNode;

export type NizelInlineNode =
  | NizelTextNode
  | NizelEmphasisNode
  | NizelStrongNode
  | NizelDeleteNode
  | NizelLineBreakNode
  | NizelInlineCodeNode
  | NizelLinkNode
  | NizelImageNode
  | NizelInlineHtmlNode;

export type NizelNode =
  | NizelRootNode
  | NizelBlockNode
  | NizelInlineNode
  | NizelListItemNode
  | NizelTableRowNode
  | NizelTableCellNode;

export type NizelTextNode = {
  type: 'text';
  value: string;
};

export type NizelLineBreakNode = {
  type: 'lineBreak';
  hard?: boolean;
  value?: string;
};

export type NizelParagraphNode = {
  type: 'paragraph';
  children: NizelInlineNode[];
};

export type NizelHeadingNode = {
  type: 'heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  text: string;
  children: NizelInlineNode[];
};

export type NizelEmphasisNode = {
  type: 'emphasis';
  children: NizelInlineNode[];
};

export type NizelStrongNode = {
  type: 'strong';
  children: NizelInlineNode[];
};

export type NizelDeleteNode = {
  type: 'delete';
  children: NizelInlineNode[];
};

export type NizelInlineCodeNode = {
  type: 'inlineCode';
  code: string;
};

export type NizelCodeNode = {
  type: 'code';
  code: string;
  lang?: string;
  meta?: string;
  filename?: string;
  highlightLines?: number[];
};

export type NizelLinkNode = {
  type: 'link';
  href: string;
  title?: string;
  external?: boolean;
  children: NizelInlineNode[];
};

export type NizelImageNode = {
  type: 'image';
  src: string;
  alt?: string;
  title?: string;
};

export type NizelInlineHtmlNode = {
  type: 'inlineHtml';
  value: string;
};

export type NizelListNode = {
  type: 'list';
  ordered: boolean;
  start?: number;
  tight?: boolean;
  children: NizelListItemNode[];
};

export type NizelListItemNode = {
  type: 'listItem';
  checked?: boolean;
  children: NizelBlockNode[];
};

export type NizelBlockquoteNode = {
  type: 'blockquote';
  children: NizelBlockNode[];
};

export type NizelThematicBreakNode = {
  type: 'thematicBreak';
};

export type NizelTableNode = {
  type: 'table';
  align?: Array<'left' | 'center' | 'right' | null>;
  children: NizelTableRowNode[];
};

export type NizelTableRowNode = {
  type: 'tableRow';
  children: NizelTableCellNode[];
};

export type NizelTableCellNode = {
  type: 'tableCell';
  children: NizelInlineNode[];
};

export type NizelHtmlNode = {
  type: 'html';
  value: string;
};

export type NizelCustomBlockNode = {
  type: 'customBlock';
  name: string;
  args?: string[];
  props?: Record<string, unknown>;
  children?: NizelBlockNode[];
  value?: unknown;
};

export type NizelHeading = {
  id: string;
  slug: string;
  text: string;
  depth: number;
  level: number;
};

export type NizelTocItem = NizelHeading;

export type NizelLink = {
  href: string;
  text: string;
  title?: string;
  external: boolean;
};

export type NizelImage = {
  src: string;
  alt?: string;
  title?: string;
};

export type NizelElementRule =
  | NizelElementDescriptor
  | ((node: NizelNode) => NizelElementDescriptor | undefined);

export type NizelElementDescriptor = {
  tag?: string;
  class?: string;
  attr?: Record<string, string | number | boolean | undefined>;
  attrs?: Record<string, string | number | boolean | undefined>;
};

export type NizelElementRules = Partial<Record<string, NizelElementRule>>;

export type NizelRenderOptions = {
  unwrapStandaloneImages?: boolean;
};

export type NizelTransform = (ast: NizelRootNode) => NizelRootNode | void;

export type NizelAutolinkOptions = {
  enabled?: boolean;
  target?: string;
  rel?: string;
};

export type NizelPlugin = {
  name?: string;
  options?: NizelOptions;
  elements?: NizelElementRules;
  blocks?: NizelBlockMap;
  template?: NizelTemplateOptions;
  filters?: Record<string, NizelTemplateFilter>;
  transforms?: NizelTransform[];
  hooks?: Partial<NizelHooks>;
  /**
   * Reverse converter(s) that turn this plugin's rendered HTML back into Markdown.
   * Passed to `htmlToMarkdown` via `options.plugins`.
   */
  htmlToMarkdown?: NizelHtmlToMarkdownHandler | NizelHtmlToMarkdownHandler[];
};

export type NizelBlockDefinition<TOptions = Record<string, unknown>> = {
  name: string;
  options?: TOptions;
  parse?: (input: NizelBlockParseInput) => unknown;
  formats?: {
    html?: (node: NizelBlockNode, ctx: NizelRenderContext) => string;
  };
};

export type NizelBlockMap = Record<string, NizelBlockDefinition>;

export type NizelBlockParseInput = {
  name: string;
  args: string[];
  props: Record<string, unknown>;
  content: string;
};

export type NizelRenderContext = {
  render(nodes: NizelBlockNode[] | NizelInlineNode[]): string;
  escape(value: unknown): string;
};

export type NizelHooks = {
  beforeParse(markdown: string, options: NizelOptions): string;
  afterParse(ast: NizelRootNode, options: NizelOptions): NizelRootNode | void;
  afterRender(html: string, options: NizelOptions): string;
};

export type NizelPresetName = 'minimal' | 'blog' | 'docs' | 'email';

export type NizelHtmlToMarkdownUnsupportedMode = 'preserve' | 'drop';

export type NizelHtmlToMarkdownOptions = {
  unsupported?: NizelHtmlToMarkdownUnsupportedMode;
  /**
   * Plugins whose rendered HTML should be converted back to its Markdown source.
   * Each plugin may ship an `htmlToMarkdown` handler that claims the nodes it emits.
   */
  plugins?: NizelPlugin[];
};

export type NizelHtmlDocNode =
  | { type: 'root'; children: NizelHtmlDocNode[] }
  | { type: 'text'; value: string }
  | { type: 'element'; tag: string; attrs: Record<string, string>; children: NizelHtmlDocNode[]; raw: string }
  | { type: 'comment'; value: string };

export type NizelHtmlElementNode = Extract<NizelHtmlDocNode, { type: 'element' }>;

export type NizelHtmlToMarkdownContext = {
  /** Render a node's children as inline Markdown. */
  inline(node: NizelHtmlDocNode): string;
  /** Render a node's children as a normalized block. */
  block(node: NizelHtmlDocNode): string;
  /** Decode and return the text content of a node subtree. */
  text(node: NizelHtmlDocNode): string;
  /** Indent continuation lines so they align under a marker of the given length. */
  indent(value: string, size: number): string;
  /** Append Markdown (such as definitions) to the end of the converted document. */
  epilogue(value: string): void;
  /** Active converter options. */
  options: Required<NizelHtmlToMarkdownOptions>;
};

/**
 * Claims an element node and returns its Markdown rendering, or `undefined` to defer
 * to the next handler / the built-in converter.
 */
export type NizelHtmlToMarkdownHandler = (
  node: NizelHtmlDocNode,
  context: NizelHtmlToMarkdownContext,
) => string | undefined;

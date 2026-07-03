import type { NizelBlockDefinition, NizelBlockNode, NizelOptions, NizelPlugin, NizelRootNode } from 'nizel';
import type {
  NormalizedPrintPluginOptions,
  PrintControlType,
  PrintMetadata,
  PrintPluginOptions,
  PrintSettings,
} from './types.js';

export const printPluginMeta = {
  id: 'print',
  label: 'Print',
  description: 'Adds print and PDF controls to Markdown documents.',
  category: 'Layout',
  defaultEnabled: false,
} as const;

const PRINT_CONTROL_TYPES = [
  'pagebreak',
  'pagebreak-before',
  'pagebreak-after',
  'keep',
  'print-only',
  'screen-only',
  'no-print',
  'print-wide',
] as const satisfies readonly PrintControlType[];

const PRINT_CONTROL_SET = new Set<string>(PRINT_CONTROL_TYPES);

export const printPlugin = (options: PrintPluginOptions = {}): NizelPlugin => {
  const normalized = normalizeOptions(options);
  const metadata: PrintMetadata['print'] = { controls: [] };

  return {
    name: printPluginMeta.id,
    options: normalized.collectMetadata ? { meta: { print: metadata } } : undefined,
    blocks: Object.fromEntries(
      PRINT_CONTROL_TYPES.map((type) => [type, printBlock(type, normalized)]),
    ) as Record<PrintControlType, NizelBlockDefinition>,
    hooks: {
      beforeParse(markdown) {
        metadata.controls = [];
        return transformPrintDirectives(markdown);
      },
      afterParse(ast, resolvedOptions) {
        if (!normalized.collectMetadata) return ast;
        const controls = collectPrintControls(ast);
        metadata.controls = controls;
        syncPrintMetadata(resolvedOptions, controls, extractPrintSettings(resolvedOptions));
        return ast;
      },
      afterRender(html) {
        if (!normalized.injectCss) return html;
        return `${printStyleTag(normalized.classPrefix)}\n${html}`;
      },
    },
  };
};

export const transformPrintDirectives = (markdown: string): string => {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let fence: { marker: string; length: number } | undefined;
  let htmlUntilBlank = false;
  let htmlClose: RegExp | undefined;
  let directiveDepth = 0;

  for (const line of lines) {
    if (fence) {
      output.push(line);
      const close = new RegExp(`^ {0,3}\\${fence.marker}{${fence.length},}\\s*$`);
      if (close.test(line)) fence = undefined;
      continue;
    }

    const fenceMatch = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
    if (fenceMatch && validFenceInfo(fenceMatch[3] ?? '', fenceMatch[2][0])) {
      fence = { marker: fenceMatch[2][0], length: fenceMatch[2].length };
      output.push(line);
      continue;
    }

    if (htmlClose || htmlUntilBlank) {
      output.push(line);
      if (htmlClose?.test(line)) htmlClose = undefined;
      if (htmlUntilBlank && !line.trim()) htmlUntilBlank = false;
      continue;
    }

    const htmlMode = rawHtmlMode(line);
    if (htmlMode.close) htmlClose = htmlMode.close;
    if (htmlMode.untilBlank) htmlUntilBlank = true;
    if (htmlMode.close || htmlMode.untilBlank) {
      output.push(line);
      const close = htmlMode.close;
      if (close?.test(line)) htmlClose = undefined;
      continue;
    }

    const transformed = transformPrintDirectiveLine(line, directiveDepth);
    directiveDepth += transformed.depthChange;
    output.push(transformed.line);
  }

  return output.join('\n');
};

const normalizeOptions = (options: PrintPluginOptions): NormalizedPrintPluginOptions => ({
  injectCss: options.injectCss ?? true,
  collectMetadata: options.collectMetadata ?? true,
  classPrefix: options.classPrefix ?? 'nizel',
});

const printBlock = (
  type: PrintControlType,
  options: NormalizedPrintPluginOptions,
): NizelBlockDefinition => ({
  name: type,
  parse() {
    return { type };
  },
  formats: {
    html(node, ctx) {
      if (node.type !== 'customBlock') return '';
      const className = `${options.classPrefix}-${type}`;
      if (type === 'pagebreak') {
        return `<div class="${ctx.escape(className)}" aria-hidden="true"></div>`;
      }
      return `<div class="${ctx.escape(className)}">${ctx.render(node.children ?? [])}</div>`;
    },
  },
});

const transformPrintDirectiveLine = (line: string, directiveDepth: number): {
  line: string;
  depthChange: number;
} => {
  const opener = /^(\s*):::([A-Za-z][\w-]*)(?:\s+(.*))?\s*$/.exec(line);
  if (opener && PRINT_CONTROL_SET.has(opener[2])) {
    return {
      line: `${opener[1]}::${opener[2]}${opener[3] ? ` ${opener[3]}` : ''}`,
      depthChange: 1,
    };
  }
  const closer = /^(\s*):::\s*$/.exec(line);
  if (closer && directiveDepth > 0) {
    return {
      line: `${closer[1]}::`,
      depthChange: -1,
    };
  }
  return { line, depthChange: 0 };
};

const collectPrintControls = (ast: NizelRootNode): PrintMetadata['print']['controls'] => {
  const controls: PrintMetadata['print']['controls'] = [];
  for (const node of ast.children) collectFromBlock(node, controls);
  return controls;
};

const collectFromBlock = (
  node: NizelBlockNode,
  controls: PrintMetadata['print']['controls'],
): void => {
  if (node.type === 'customBlock' && isPrintControlType(node.name)) {
    controls.push({ type: node.name });
    for (const child of node.children ?? []) collectFromBlock(child, controls);
    return;
  }

  if (node.type === 'blockquote') {
    for (const child of node.children) collectFromBlock(child, controls);
  }

  if (node.type === 'list') {
    for (const item of node.children) {
      for (const child of item.children) collectFromBlock(child, controls);
    }
  }
};

const syncPrintMetadata = (
  resolvedOptions: NizelOptions | undefined,
  controls: PrintMetadata['print']['controls'],
  settings: PrintSettings | undefined,
): void => {
  const meta = resolvedOptions?.meta as Partial<PrintMetadata> | undefined;
  if (!meta) return;
  const print = (meta.print ?? { controls: [] }) as PrintMetadata['print'];
  print.controls = controls;
  if (settings) print.settings = settings;
  else delete print.settings;
  meta.print = print;
};

const extractPrintSettings = (resolvedOptions: NizelOptions | undefined): PrintSettings | undefined => {
  const source = (resolvedOptions?.meta as Record<string, unknown> | undefined)?.print;
  if (!source || typeof source !== 'object') return undefined;

  const candidate = source as Record<string, unknown>;
  const settings: PrintSettings = {};
  if (typeof candidate.title === 'string') settings.title = candidate.title;
  if (typeof candidate.pageSize === 'string') settings.pageSize = candidate.pageSize;
  if (candidate.orientation === 'portrait' || candidate.orientation === 'landscape') {
    settings.orientation = candidate.orientation;
  }
  if (typeof candidate.margins === 'string') settings.margins = candidate.margins;
  if (typeof candidate.showDate === 'boolean') settings.showDate = candidate.showDate;
  if (typeof candidate.showUrl === 'boolean') settings.showUrl = candidate.showUrl;

  return Object.keys(settings).length > 0 ? settings : undefined;
};

const printStyleTag = (classPrefix: string): string => {
  const prefix = classPrefix.replace(/[^A-Za-z0-9_-]/g, '');
  return `<style data-nizel-plugin="print">${printCss(prefix)}</style>`;
};

const printCss = (prefix: string): string => `@media print {
  .${prefix}-pagebreak {
    display: block;
    break-after: page;
    page-break-after: always;
  }

  .${prefix}-pagebreak-before {
    break-before: page;
    page-break-before: always;
  }

  .${prefix}-pagebreak-after {
    break-after: page;
    page-break-after: always;
  }

  .${prefix}-keep {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .${prefix}-print-only {
    display: block;
  }

  .${prefix}-screen-only,
  .${prefix}-no-print {
    display: none !important;
  }

  .${prefix}-print-wide {
    width: 100%;
    max-width: none;
  }
}

@media screen {
  .${prefix}-print-only {
    display: none !important;
  }
}`;

const isPrintControlType = (value: string): value is PrintControlType => PRINT_CONTROL_SET.has(value);

const validFenceInfo = (info: string, marker: string): boolean => {
  return marker !== '`' || !info.includes('`');
};

const rawHtmlMode = (line: string): { close?: RegExp; untilBlank?: boolean } => {
  if (!/^ {0,3}</.test(line)) return {};
  const trimmed = line.trimStart();
  if (/^<(script|pre|style|textarea)(?:\s|>|$)/i.test(trimmed)) {
    const tag = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(trimmed)?.[1];
    return tag ? { close: new RegExp(`</${tag}>`, 'i') } : {};
  }
  if (/^<!--/.test(trimmed)) return { close: /-->/ };
  if (/^<\?/.test(trimmed)) return { close: /\?>/ };
  if (/^<![A-Z]/.test(trimmed)) return { close: />/ };
  if (/^<!\[CDATA\[/.test(trimmed)) return { close: /\]\]>/ };
  if (/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s|\/?>|$)/.test(trimmed)) return { untilBlank: true };
  return {};
};

export default printPlugin;

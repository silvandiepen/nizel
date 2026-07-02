import { collect } from './collect.js';
import { extractFrontmatter } from './frontmatter.js';
import { resolveOptions } from './options.js';
import { parseMarkdown } from './parse.js';
import { renderHtml } from './render.js';
import { renderTemplate } from './template.js';
import type {
  NizelElementRules,
  NizelOptions,
  NizelProcessor,
  NizelPresetName,
  NizelResult,
  NizelRootNode,
  NizelTemplateOptions,
  NizelUseNizel,
} from './types.js';

type PreparedMarkdown<TRuntimeMeta extends Record<string, unknown> = Record<string, unknown>> = {
  ast: NizelRootNode;
  meta: TRuntimeMeta;
  resolved: NizelOptions;
};

type PreparedMeta<TRuntimeMeta extends Record<string, unknown> = Record<string, unknown>> = {
  markdown: string;
  meta: TRuntimeMeta;
  resolved: NizelOptions;
};

/**
 * Creates a configured Nizel processor.
 */
function createNizel<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  options: NizelOptions<TMeta> = {},
): NizelProcessor {
  const presetOptions = options.preset ? resolvePreset(options.preset) : {};
  const effectiveOptions = { ...presetOptions, ...options, preset: undefined };
  const baseResolved = resolveOptions(effectiveOptions as NizelOptions, {});

  /**
   * Processes Markdown with processor and runtime options.
   */
  async function process<
    TRuntimeMeta extends Record<string, unknown> = TMeta,
  >(
    markdown: string,
    runtimeOptions: NizelOptions<TRuntimeMeta> = {},
  ): Promise<NizelResult<unknown, TRuntimeMeta>> {
    const { ast, meta, resolved } = prepareMarkdown(markdown, runtimeOptions);
    const collected = collect(ast);
    const finalHtml = renderPreparedHtml(ast, resolved);
    const output = resolved.output ?? 'html';
    const result = output === 'text' ? collected.text : output === 'ast' ? ast : finalHtml;

    return {
      result,
      html: finalHtml,
      text: collected.text,
      ast,
      meta: meta as TRuntimeMeta,
      frontmatter: meta as TRuntimeMeta,
      title: stringMeta(meta.title) ?? collected.headings[0]?.text,
      description: stringMeta(meta.description),
      excerpt: collected.excerpt,
      toc: resolved.toc === false ? [] : collected.headings,
      headings: collected.headings,
      links: collected.links,
      images: collected.images,
      readingTime: collected.readingTime,
    };
  }

  const nizel = process as NizelProcessor;
  nizel.html = async (markdown, runtimeOptions) => {
    const { ast, resolved } = prepareMarkdown(markdown, runtimeOptions);
    return renderPreparedHtml(ast, resolved);
  };
  nizel.text = async (markdown, runtimeOptions) => {
    const { ast } = prepareMarkdown(markdown, runtimeOptions);
    return collect(ast).text;
  };
  nizel.ast = async (markdown, runtimeOptions): Promise<NizelRootNode> => {
    return prepareMarkdown(markdown, runtimeOptions).ast;
  };
  nizel.meta = async <
    TRuntimeMeta extends Record<string, unknown> = Record<string, unknown>,
  >(
    markdown: string,
    runtimeOptions?: NizelOptions<TRuntimeMeta>,
  ): Promise<TRuntimeMeta> => {
    return prepareMeta(markdown, runtimeOptions).meta as TRuntimeMeta;
  };
  nizel.preset = (name) => createNizel(resolvePreset(name));
  nizel.parse = async (markdown, runtimeOptions) => {
    const resolved = resolveRuntime(runtimeOptions as NizelOptions);
    const extracted = resolved.frontmatter === false ? { markdown, frontmatter: {} } : extractFrontmatter(markdown);
    let preparedMarkdown = extracted.markdown;
    for (const plugin of resolved.plugins ?? []) {
      const next = plugin.hooks?.beforeParse?.(preparedMarkdown, resolved);
      if (next !== undefined) preparedMarkdown = next;
    }
    return parseMarkdown(preparedMarkdown, {
      anchors: resolved.anchors !== false,
      autolinks: resolved.autolinks,
      blocks: resolved.blocks ?? {},
      safe: resolved.safe !== false,
      slugStyle: resolved.slugStyle,
    });
  };
  nizel.render = (ast, runtimeOptions) => {
    const resolved = resolveRuntime(runtimeOptions as NizelOptions);
    return renderHtml(ast, withAutolinkElements(resolved.elements ?? {}, resolved.autolinks), resolved.blocks ?? {}, {
      unwrapStandaloneImages: resolved.unwrapStandaloneImages === true,
    });
  };

  return nizel;

  /**
   * Resolves options, frontmatter, templates, hooks, parsing, and transforms.
   */
  function prepareMarkdown<TRuntimeMeta extends Record<string, unknown> = TMeta>(
    markdown: string,
    runtimeOptions: NizelOptions<TRuntimeMeta> = {},
  ): PreparedMarkdown<TRuntimeMeta> {
    const preparedMeta = prepareMeta(markdown, runtimeOptions);
    let preparedMarkdown = preparedMeta.markdown;

    for (const plugin of preparedMeta.resolved.plugins ?? []) {
      const nextMarkdown = plugin.hooks?.beforeParse?.(preparedMarkdown, preparedMeta.resolved);
      if (nextMarkdown !== undefined) {
        preparedMarkdown = nextMarkdown;
      }
    }

    let ast = parseMarkdown(preparedMarkdown, {
      anchors: preparedMeta.resolved.anchors !== false,
      autolinks: preparedMeta.resolved.autolinks,
      blocks: preparedMeta.resolved.blocks ?? {},
      safe: preparedMeta.resolved.safe !== false,
      slugStyle: preparedMeta.resolved.slugStyle,
    });

    for (const plugin of preparedMeta.resolved.plugins ?? []) {
      const afterResult = plugin.hooks?.afterParse?.(ast, preparedMeta.resolved);
      if (afterResult) ast = afterResult;
    }

    for (const transform of preparedMeta.resolved.transforms ?? []) {
      const transformResult = transform(ast);
      if (transformResult) ast = transformResult;
    }

    return {
      ast,
      meta: preparedMeta.meta,
      resolved: preparedMeta.resolved,
    };
  }

  /**
   * Resolves options, frontmatter, metadata templates, and body templates.
   */
  function prepareMeta<TRuntimeMeta extends Record<string, unknown> = TMeta>(
    markdown: string,
    runtimeOptions: NizelOptions<TRuntimeMeta> = {},
  ): PreparedMeta<TRuntimeMeta> {
    const resolved = resolvePreparedRuntime(runtimeOptions as NizelOptions);
    const extracted =
      resolved.frontmatter === false
        ? { markdown, frontmatter: {} }
        : extractFrontmatter(markdown);
    let meta = {
      ...extracted.frontmatter,
      ...(resolved.meta as Record<string, unknown> | undefined),
    };
    let data = {
      ...meta,
      ...(resolved.data ?? {}),
      meta,
      frontmatter: extracted.frontmatter,
    };

    if (resolved.template !== false) {
      meta = renderObjectTemplates(meta, data, resolved.template as NizelTemplateOptions);
      data = {
        ...meta,
        ...(resolved.data ?? {}),
        meta,
        frontmatter: meta,
      };
    }

    const templated =
      resolved.template === false || !hasTemplateSyntax(extracted.markdown)
        ? extracted.markdown
        : renderTemplate(
            extracted.markdown,
            data,
            resolved.template as NizelTemplateOptions,
          );

    return {
      markdown: templated,
      meta: meta as TRuntimeMeta,
      resolved,
    };
  }

  /**
   * Reuses the resolved processor options when a call has no runtime overrides.
   */
  function resolveRuntime(runtimeOptions?: NizelOptions): NizelOptions {
    return hasRuntimeOptions(runtimeOptions)
      ? resolveOptions(effectiveOptions as NizelOptions, runtimeOptions)
      : baseResolved;
  }

  /**
   * Returns per-call resolved options with template data materialized.
   */
  function resolvePreparedRuntime(runtimeOptions?: NizelOptions): NizelOptions {
    const resolved = resolveRuntime(runtimeOptions);
    return {
      ...resolved,
      data: { ...(resolved.variables ?? {}), ...(resolved.data ?? {}) },
    };
  }
}

/**
 * Renders a prepared AST and applies after-render plugin hooks.
 */
function renderPreparedHtml(ast: NizelRootNode, resolved: NizelOptions): string {
  const html = renderHtml(
    ast,
    withAutolinkElements(resolved.elements ?? {}, resolved.autolinks),
    resolved.blocks ?? {},
    {
      unwrapStandaloneImages: resolved.unwrapStandaloneImages === true,
    },
  );

  let finalHtml = html;
  for (const plugin of resolved.plugins ?? []) {
    const modified = plugin.hooks?.afterRender?.(finalHtml, resolved);
    if (modified !== undefined) finalHtml = modified;
  }

  return finalHtml;
}

/**
 * Renders string values inside an object as Nizel templates.
 */
function renderObjectTemplates(
  object: Record<string, unknown>,
  data: Record<string, unknown>,
  options: NizelTemplateOptions,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => [
      key,
      typeof value === 'string' && hasTemplateSyntax(value)
        ? renderTemplate(value, data, options)
        : value,
    ]),
  );
}

/**
 * Checks whether a value contains Nizel template delimiters.
 */
function hasTemplateSyntax(value: string): boolean {
  return value.includes('{{');
}

/**
 * Checks whether a call supplied runtime options that need merging.
 */
function hasRuntimeOptions(runtimeOptions?: NizelOptions): runtimeOptions is NizelOptions {
  return Boolean(runtimeOptions && Object.keys(runtimeOptions).length > 0);
}

export const useNizel = createNizel as NizelUseNizel;
useNizel.preset = (name: NizelPresetName) => createNizel(resolvePreset(name));

/**
 * Returns a metadata value only when it is a string.
 */
function stringMeta(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Returns the option bundle for a named built-in preset.
 */
function resolvePreset(name: NizelPresetName): NizelOptions {
  if (name === 'minimal') {
    return { frontmatter: false, template: false, toc: false, anchors: false, autolinks: false };
  }

  if (name === 'blog') {
    return {
      frontmatter: true,
      toc: true,
      anchors: true,
      elements: {
        time: { class: 'nizel-date' },
      },
    };
  }

  if (name === 'email') {
    return {
      safe: true,
      anchors: false,
      autolinks: { enabled: true },
      elements: {
        a: { attr: { target: undefined, rel: undefined } },
        table: { attr: { role: 'presentation', cellpadding: '0', cellspacing: '0', border: '0' } },
      },
    };
  }

  if (name === 'docs') {
    return {
      toc: true,
      anchors: true,
      elements: {
        h2: { class: 'nizel-docs-heading' },
        code: { class: 'nizel-code' },
      },
    };
  }

  return {};
}

/**
 * Adds configured autolink attributes to anchor rendering rules.
 */
function withAutolinkElements(
  elements: NizelElementRules,
  autolinks: NizelOptions['autolinks'],
): NizelElementRules {
  if (!autolinks || typeof autolinks !== 'object' || (!autolinks.target && !autolinks.rel)) {
    return elements;
  }

  const existing = elements.a;
  return {
    ...elements,
    a(node) {
      const base = typeof existing === 'function' ? existing(node) : existing;
      return {
        ...base,
        attrs: {
          target: autolinks.target,
          rel: autolinks.rel,
          ...base?.attrs,
        },
      };
    },
  };
}

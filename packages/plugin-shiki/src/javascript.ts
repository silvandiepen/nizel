import { createHighlighter, type BundledHighlighterOptions } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import type { ShikiHighlighterInput } from './index.js';

export type JavaScriptShikiHighlighterOptions = Omit<
  BundledHighlighterOptions<string, string>,
  'engine'
> & {
  /**
   * Language to use when a code fence does not declare one.
   */
  defaultLang?: string;
  /**
   * Theme to use when the plugin input does not provide one.
   */
  defaultTheme?: string;
};

export type JavaScriptShikiHighlighter = (
  code: string,
  input: ShikiHighlighterInput,
) => string | undefined;

/**
 * Returns the first string theme from a Shiki theme list.
 */
const firstStringTheme = (themes: JavaScriptShikiHighlighterOptions['themes']): string | undefined =>
  themes.find((theme): theme is string => typeof theme === 'string');

/**
 * Creates a Shiki highlighter callback that uses Shiki's JavaScript regex engine.
 *
 * Use this helper in Worker-style runtimes when bundling Shiki's default
 * Oniguruma WASM engine is not desirable.
 */
export const createJavaScriptShikiHighlighter = async (
  options: JavaScriptShikiHighlighterOptions,
): Promise<JavaScriptShikiHighlighter> => {
  const highlighter = await createHighlighter({
    ...options,
    engine: createJavaScriptRegexEngine(),
  });
  const defaultLang = options.defaultLang ?? 'text';
  const defaultTheme = options.defaultTheme ?? firstStringTheme(options.themes) ?? 'github-dark';

  return (code, input) =>
    highlighter.codeToHtml(code, {
      lang: input.lang ?? defaultLang,
      theme: input.theme ?? defaultTheme,
      meta: input.meta ? { __raw: input.meta } : undefined,
    });
};

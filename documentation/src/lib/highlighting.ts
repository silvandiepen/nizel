import { useNizel, type NizelOptions } from "nizel";
import { shikiPlugin, type ShikiHighlighterInput } from "nizel-plugin-shiki";
import { createHighlighter } from "shiki";

const languages = ["bash", "css", "html", "javascript", "json", "markdown", "shell", "swift", "typescript", "yaml"];
const aliases: Record<string, string> = { js: "javascript", jsx: "javascript", md: "markdown", sh: "bash", ts: "typescript", tsx: "typescript", yml: "yaml" };

const highlighterPromise = createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: languages,
});

function addLineData(html: string, highlighted: number[] = []): string {
  let line = 0;
  return html.replace(/<span class="line">/g, () => {
    line += 1;
    const selected = highlighted.includes(line) ? " highlighted" : "";
    return `<span class="line${selected}" data-line="${line}">`;
  });
}

/** Creates a Nizel processor with dual-theme Shiki output and numbered lines. */
export async function createHighlightedProcessor(options: NizelOptions = {}) {
  const highlighter = await highlighterPromise;
  return useNizel({
    ...options,
    plugins: [
      ...(options.plugins ?? []),
      shikiPlugin({
        highlighter(code: string, input: ShikiHighlighterInput) {
          const requested = aliases[input.lang ?? ""] ?? input.lang ?? "text";
          const lang = highlighter.getLoadedLanguages().includes(requested) ? requested : "text";
          const html = highlighter.codeToHtml(code.replace(/\n$/, ""), {
            lang,
            themes: { light: "github-light", dark: "github-dark" },
            meta: input.meta ? { __raw: input.meta } : undefined,
          });
          return addLineData(html, input.highlightLines).replace("<pre class=\"shiki", `<pre data-language=\"${lang.toUpperCase()}\" class=\"shiki`);
        },
      }),
    ],
  });
}

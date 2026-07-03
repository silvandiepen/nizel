import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { useNizel } from 'nizel';
import { abbrPlugin } from 'nizel-plugin-abbr';
import { alertPlugin } from 'nizel-plugin-alert';
import { autolinkPlugin } from 'nizel-plugin-autolink';
import { citationsPlugin } from 'nizel-plugin-citations';
import { codeCopyPlugin } from 'nizel-plugin-code-copy';
import { deflistPlugin } from 'nizel-plugin-deflist';
import { detailsPlugin } from 'nizel-plugin-details';
import { diagramsPlugin } from 'nizel-plugin-diagrams';
import { emojiPlugin } from 'nizel-plugin-emoji';
import { footnotesPlugin } from 'nizel-plugin-footnotes';
import { frontmatterUiPlugin } from 'nizel-plugin-frontmatter-ui';
import { headingAnchorsPlugin } from 'nizel-plugin-heading-anchors';
import { mathPlugin } from 'nizel-plugin-math';
import { mediaPlugin } from 'nizel-plugin-media';
import { shikiPlugin } from 'nizel-plugin-shiki';
import { tocPlugin } from 'nizel-plugin-toc';
import { typographyPlugin } from 'nizel-plugin-typography';

const root = dirname(fileURLToPath(import.meta.url));
const markdown = await readFile(join(root, 'preview.md'), 'utf8');

const highlighter = (code, input) => {
  const language = input.lang ? ` language-${escapeHtml(input.lang)}` : '';
  return `<pre class="shiki${language}"><code>${highlightPreviewCode(code)}</code></pre>`;
};

const processor = useNizel({
  plugins: [
    abbrPlugin(),
    alertPlugin(),
    autolinkPlugin(),
    citationsPlugin(),
    detailsPlugin(),
    deflistPlugin(),
    frontmatterUiPlugin(),
    headingAnchorsPlugin(),
    mediaPlugin(),
    tocPlugin(),
    footnotesPlugin(),
    mathPlugin(),
    typographyPlugin(),
    shikiPlugin({ highlighter }),
    diagramsPlugin(),
    codeCopyPlugin(),
    emojiPlugin(),
  ],
});

const html = await processor.html(markdown);
await writeFile(join(root, 'preview.html'), renderShell(html));

function renderShell(content) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Nizel Style Preview</title>
    <link rel="stylesheet" href="./dist/nizel-style.css">
    <style>
      body {
        margin: 0;
        padding: 3em 1.5em;
        background: #f6f7f9;
        color: #1f2328;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif;
      }

      .preview-shell {
        max-width: 56em;
        margin: 0 auto;
      }

      .preview-controls {
        display: flex;
        gap: 0.75em;
        margin-bottom: 1.5em;
        align-items: center;
        color: #57606a;
        font-size: 0.9em;
      }

      .preview-controls button {
        border: 1px solid #d0d7de;
        border-radius: 0.5em;
        background: #fff;
        color: #1f2328;
        font: inherit;
        padding: 0.5em 0.75em;
        cursor: pointer;
      }

      .theme-light {
        background: #f6f7f9;
      }

      .theme-light {
        --background: #ffffff;
        --foreground: #1f2328;
        --primary: #2563eb;
        --secondary: #7c3aed;
        --surface: #f6f8fa;
        --surface-raised: #ffffff;
        --border: #d0d7de;
        --code-background: #f6f8fa;
      }

      .theme-dark {
        background: #0d1117;
      }

      .theme-dark .preview-controls {
        color: #8b949e;
      }

      .theme-dark .preview-controls button {
        border-color: #30363d;
        background: #161b22;
        color: #f0f3f6;
      }

      .theme-dark {
        --background: #0d1117;
        --foreground: #f0f3f6;
        --primary: #79c0ff;
        --secondary: #d2a8ff;
        --surface: #161b22;
        --surface-raised: #21262d;
        --border: #30363d;
        --code-background: #161b22;
      }

      .preview-document {
        max-width: 72ch;
        margin: 0 auto;
        padding: 2em;
        border: 1px solid var(--border);
        border-radius: 0.75em;
        background: var(--background);
      }
    </style>
  </head>
  <body class="theme-light">
    <main class="preview-shell">
      <div class="preview-controls">
        <button type="button" id="theme-toggle">Toggle theme</button>
        <span>Previewing rendered <code>preview.md</code> with <code>dist/nizel-style.css</code></span>
      </div>

      <div class="preview-document">
      <article class="nizel-content">
${indent(content, 8)}
      </article>
      </div>
    </main>

    <script>
      const requestedTheme = new URLSearchParams(window.location.search).get("theme");
      if (requestedTheme === "dark") {
        document.body.classList.remove("theme-light");
        document.body.classList.add("theme-dark");
      }

      document.getElementById("theme-toggle").addEventListener("click", () => {
        document.body.classList.toggle("theme-light");
        document.body.classList.toggle("theme-dark");
      });

      if (document.querySelector(".mermaid")) {
        import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
          .then(({ default: mermaid }) => {
            mermaid.initialize({ startOnLoad: false, theme: document.body.classList.contains("theme-dark") ? "dark" : "default" });
            return mermaid.run({ querySelector: ".mermaid" });
          })
          .catch(() => {
            for (const block of document.querySelectorAll(".mermaid")) {
              block.dataset.mermaidUnavailable = "true";
            }
          });
      }
    </script>
  </body>
</html>
`;
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value.split('\n').map((line) => `${prefix}${line}`).join('\n');
}

function highlightPreviewCode(code) {
  return escapeHtml(code)
    .replace(/\b(import|export|const|await|return|async|from)\b/g, '<span class="hl-keyword">$1</span>')
    .replace(/(&#39;[^&#]+&#39;|&quot;[^&]+&quot;)/g, '<span class="hl-string">$1</span>');
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

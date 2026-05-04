import { defineNizelPlugin } from 'nizel';

/**
 * Creates a definition list plugin that transforms `: definition` syntax
 * into `<dl>/<dt>/<dd>` HTML before Nizel parses the markdown.
 *
 * Syntax:
 *   Term 1
 *   : Definition 1
 *
 *   Term 2
 *   : Definition 2a
 *   : Definition 2b
 */
export function deflistPlugin() {
  return defineNizelPlugin({
    name: 'deflist',
    hooks: {
      beforeParse(markdown) {
        const lines = markdown.split('\n');
        const result = [];
        let i = 0;

        while (i < lines.length) {
          // Look for a term line (non-empty, not a definition) followed by definition lines
          if (
            lines[i].trim() &&
            !lines[i].trimStart().startsWith(': ') &&
            i + 1 < lines.length &&
            lines[i + 1].trimStart().startsWith(': ')
          ) {
            const entries = [];
            let term = lines[i].trim();
            let definitions = [];

            i += 1;
            // Collect consecutive definition lines
            while (i < lines.length && lines[i].trimStart().startsWith(': ')) {
              const defText = lines[i].trimStart().slice(2).trim();
              definitions.push(defText);
              i += 1;
            }

            entries.push({ term, definitions });

            // Check for more term+definitions groups
            while (i < lines.length) {
              // Skip blank lines between groups within the same list
              if (!lines[i].trim()) {
                // Peek ahead: if next non-blank line is a term followed by definition
                let peek = i;
                while (peek < lines.length && !lines[peek].trim()) peek++;
                if (
                  peek < lines.length &&
                  lines[peek].trim() &&
                  !lines[peek].trimStart().startsWith(': ') &&
                  peek + 1 < lines.length &&
                  lines[peek + 1].trimStart().startsWith(': ')
                ) {
                  i = peek;
                  continue;
                }
                break;
              }

              // Check if this is another term followed by definitions
              if (
                lines[i].trim() &&
                !lines[i].trimStart().startsWith(': ') &&
                i + 1 < lines.length &&
                lines[i + 1].trimStart().startsWith(': ')
              ) {
                term = lines[i].trim();
                definitions = [];
                i += 1;
                while (i < lines.length && lines[i].trimStart().startsWith(': ')) {
                  const defText = lines[i].trimStart().slice(2).trim();
                  definitions.push(defText);
                  i += 1;
                }
                entries.push({ term, definitions });
              } else {
                break;
              }
            }

            // Build the HTML
            let html = '<dl>\n';
            for (const entry of entries) {
              html += `  <dt>${entry.term}</dt>\n`;
              for (const def of entry.definitions) {
                html += `  <dd><p>${def}</p></dd>\n`;
              }
            }
            html += '</dl>';
            result.push(html);
          } else {
            result.push(lines[i]);
            i += 1;
          }
        }

        return result.join('\n');
      },
    },
  });
}

export default deflistPlugin;

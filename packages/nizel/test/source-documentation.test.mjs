import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { test } from 'vitest';

test('source function declarations and exported function constants have JSDoc', () => {
  const root = new URL('../../../', import.meta.url);
  const files = [
    ...listSourceFiles(new URL('packages/nizel/src/', root), root),
    ...listSourceFiles(new URL('packages/plugin-autolink/src/', root), root),
    ...listSourceFiles(new URL('packages/plugin-code-copy/src/', root), root),
    ...listSourceFiles(new URL('packages/plugin-shiki/src/', root), root),
  ];
  const missing = [];

  for (const file of files) {
    const source = readFileSync(new URL(file, root), 'utf8');
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      const definesFunction =
        /^(export\s+)?(async\s+)?function\s+\w+/.test(line.trim()) ||
        (/^(export\s+)?const\s+\w+\s*(?::[^=]+)?=\s*(?:<[^>]+>\s*)?\(/.test(line.trim()) &&
          lines.slice(index, index + 6).join('\n').includes('=>'));
      if (!definesFunction) return;

      const previous = lines
        .slice(Math.max(0, index - 6), index)
        .join('\n')
        .trim();
      if (!previous.includes('/**')) missing.push(`${file}:${index + 1}`);
    });
  }

  assert.deepEqual(missing, []);
});

/**
 * Lists source files below a package source directory.
 */
const listSourceFiles = (directory, root) => {
  return readdirSync(directory)
    .flatMap((entry) => {
      const url = new URL(`${entry}`, directory);
      const stats = statSync(url);
      if (stats.isDirectory()) return listSourceFiles(new URL(`${entry}/`, directory), root);
      if (!/\.[jt]s$/.test(entry)) return [];
      return [url.pathname.slice(root.pathname.length)];
    })
    .sort();
};

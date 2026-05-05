import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

export const fixturesDir = new URL('../fixtures/', import.meta.url);

export const readFixtures = async ({ selected = [] } = {}) => {
  const entries = await readdir(fixturesDir);
  const selectedNames = new Set(selected);
  const fixtureFiles = entries
    .filter((entry) => extname(entry) === '.md')
    .filter((entry) => selectedNames.size === 0 || selectedNames.has(entry.replace(/\.md$/, '')))
    .sort();

  return Promise.all(
    fixtureFiles.map(async (file) => {
      const url = new URL(file, fixturesDir);
      const markdown = await readFile(url, 'utf8');
      const fileStat = await stat(url);

      return {
        name: file.replace(/\.md$/, ''),
        file: join('fixtures', file),
        markdown,
        bytes: fileStat.size,
        lines: markdown.split('\n').length,
      };
    }),
  );
};


import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';

const fixtureUrl = new URL('../fixtures/commonmark.md', import.meta.url);
const require = createRequire(import.meta.url);

const main = async () => {
  const { tests: examples } = require('commonmark-spec');
  const markdown = examples
    .map((example) => [`<!-- Example ${example.number}: ${example.section} -->`, example.markdown].join('\n'))
    .join('\n\n---\n\n');

  await mkdir(dirname(fixtureUrl.pathname), { recursive: true });
  await writeFile(fixtureUrl, `${markdown}\n`);
  console.log(`Wrote ${examples.length} CommonMark examples to fixtures/commonmark.md`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

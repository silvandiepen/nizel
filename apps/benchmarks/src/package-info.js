import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, parse } from 'node:path';
import { readLocalNizelInfo, usesLocalNizel } from './nizel-local.js';

const require = createRequire(import.meta.url);

const findPackageJson = (entryPath) => {
  let directory = dirname(entryPath);
  const { root } = parse(directory);

  while (directory !== root) {
    const packageJson = join(directory, 'package.json');
    if (existsSync(packageJson)) return packageJson;
    directory = dirname(directory);
  }

  throw new Error(`Could not find package.json for ${entryPath}`);
};

const readPackageVersion = async (packageName) => {
  const packagePath = findPackageJson(require.resolve(packageName));
  const contents = await readFile(packagePath, 'utf8');
  return JSON.parse(contents).version;
};

export const readPackageInfo = async () => {
  const localNizel = usesLocalNizel() ? await readLocalNizelInfo() : undefined;

  return {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    packages: {
      'markdown-it': await readPackageVersion('markdown-it'),
      marked: await readPackageVersion('marked'),
      nizel: localNizel ? `${localNizel.name}@${localNizel.version}` : await readPackageVersion('nizel'),
      remark: await readPackageVersion('remark-parse'),
      'remark-gfm': await readPackageVersion('remark-gfm'),
      'remark-html': await readPackageVersion('remark-html'),
      tinybench: await readPackageVersion('tinybench'),
    },
    localNizel,
  };
};

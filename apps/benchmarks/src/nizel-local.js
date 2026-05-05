import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultDist = new URL('../../../packages/nizel/dist/', import.meta.url);
const defaultPackageJson = new URL('../../../packages/nizel/package.json', import.meta.url);

const argValue = (name) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
};

const resolveDirectoryUrl = (path) => {
  const resolved = resolve(path);
  return new URL(`${pathToFileURL(resolved).href.replace(/\/?$/, '/')}`);
};

const configuredRepo = () => argValue('nizel-repo') ?? process.env.NIZEL_REPO;

const configuredDist = () => argValue('nizel-dist') ?? process.env.NIZEL_DIST;

const configuredPackageJson = () => argValue('nizel-package-json') ?? process.env.NIZEL_PACKAGE_JSON;

const repoDist = (repo) => resolve(repo, 'packages/nizel/dist');

const repoPackageJson = (repo) => resolve(repo, 'packages/nizel/package.json');

const cwdPackageJson = () => resolve(process.cwd(), 'packages/nizel/package.json');

const hasDefaultPackageJson = () => existsSync(fileURLToPath(defaultPackageJson));

/**
 * Checks whether this benchmark run explicitly targets a local Nizel checkout.
 */
export const usesLocalNizel = () => {
  return Boolean(
    configuredDist() ||
      configuredRepo() ||
      configuredPackageJson() ||
      existsSync(cwdPackageJson()) ||
      hasDefaultPackageJson(),
  );
};

/**
 * Resolves the local Nizel dist directory for benchmark imports.
 */
export const getNizelDistUrl = () => {
  const dist = configuredDist();
  if (dist) {
    return resolveDirectoryUrl(dist);
  }

  const repo = configuredRepo();
  if (repo) {
    return resolveDirectoryUrl(repoDist(repo));
  }

  if (existsSync(cwdPackageJson())) {
    return resolveDirectoryUrl(repoDist(process.cwd()));
  }

  return defaultDist;
};

export const importNizelDist = async (file) => import(new URL(file, getNizelDistUrl()));

/**
 * Imports Nizel from the configured local dist, or from node_modules by default.
 */
export const importNizel = async () => {
  return usesLocalNizel() ? importNizelDist('index.js') : import('nizel');
};

/**
 * Resolves the package.json for the local Nizel checkout.
 */
export const getNizelPackageJsonUrl = () => {
  const packageJson = configuredPackageJson();
  if (packageJson) {
    return pathToFileURL(resolve(packageJson));
  }

  const repo = configuredRepo();
  if (repo) {
    return pathToFileURL(repoPackageJson(repo));
  }

  if (existsSync(cwdPackageJson())) {
    return pathToFileURL(cwdPackageJson());
  }

  return defaultPackageJson;
};

/**
 * Reads metadata for the local Nizel checkout used by benchmark runs.
 */
export const readLocalNizelInfo = async () => {
  const packageJsonUrl = getNizelPackageJsonUrl();
  const packageJson = JSON.parse(await readFile(packageJsonUrl, 'utf8'));

  return {
    name: packageJson.name,
    version: packageJson.version,
    dist: fileURLToPath(getNizelDistUrl()),
    packageJson: fileURLToPath(packageJsonUrl),
  };
};

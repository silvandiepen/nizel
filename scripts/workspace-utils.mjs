import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const workspaceRoots = ['packages'];

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export const readPackage = (dir) => readJson(join(dir, 'package.json'));

export const listWorkspaces = () => {
  const out = [];
  for (const root of workspaceRoots) {
    let entries;
    try {
      entries = readdirSync(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      let pkg;
      try {
        pkg = readPackage(dir);
      } catch {
        continue;
      }
      if (pkg.private || !pkg.name || !pkg.version) continue;
      out.push({ dir, pkg });
    }
  }
  return out;
};

const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];

export const workspaceDeps = (pkg, knownNames) => {
  const deps = [];
  for (const field of DEP_FIELDS) {
    const map = pkg[field];
    if (!map) continue;
    for (const name of Object.keys(map)) {
      if (name === pkg.name) continue;
      if (knownNames.has(name) && !deps.includes(name)) deps.push(name);
    }
  }
  return deps;
};

export const bumpPatch = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!match) throw new Error(`Unsupported version format: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4]}`;
};

export const publishedVersions = (name) => {
  const result = spawnSync('npm', ['view', name, 'versions', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    if ((result.stderr || '').includes('E404') || (result.stderr || '').includes('404')) return new Set();
    throw new Error(`Could not read published versions for ${name}:\n${result.stderr}`);
  }

  const parsed = JSON.parse(result.stdout || '[]');
  return new Set(Array.isArray(parsed) ? parsed : [parsed]);
};

export const nextUnpublishedVersion = (current, published) => {
  let version = current;
  while (published.has(version)) version = bumpPatch(version);
  return version;
};

const parseSemver = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
  return match ? match.slice(1, 4).map(Number) : [0, 0, 0];
};

export const compareSemver = (a, b) => {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
};

export const tagFor = (name, version) => `${name}@${version}`;

export const tagExists = (tag) => {
  const result = spawnSync('git', ['tag', '-l', tag], { encoding: 'utf8' });
  if (result.status !== 0) return false;
  return result.stdout.trim() === tag;
};

export const latestTagFor = (name) => {
  const prefix = `${name}@`;
  const result = spawnSync('git', ['tag', '-l', `${prefix}*`], { encoding: 'utf8' });
  if (result.status !== 0) return null;
  const tags = result.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  let best = null;
  for (const tag of tags) {
    if (!tag.startsWith(prefix)) continue;
    const version = tag.slice(prefix.length);
    if (!/^\d+\.\d+\.\d+/.test(version)) continue;
    if (!best || compareSemver(version, best.version) > 0) best = { tag, version };
  }
  return best;
};

export const hasChangesSince = (ref, dir) => {
  const result = spawnSync('git', ['diff', '--quiet', ref, 'HEAD', '--', dir], { encoding: 'utf8' });
  return result.status !== 0;
};

export const topologicalOrder = (workspaces, knownNames) => {
  const byName = new Map(workspaces.map((w) => [w.pkg.name, w]));
  const visited = new Set();
  const order = [];

  const visit = (name, stack) => {
    if (visited.has(name)) return;
    if (stack.has(name)) return;
    stack.add(name);
    for (const dep of workspaceDeps(byName.get(name).pkg, knownNames)) {
      if (byName.has(dep)) visit(dep, stack);
    }
    visited.add(name);
    order.push(name);
  };

  for (const name of byName.keys()) visit(name, new Set());
  return order;
};

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceRoots = ['packages'];
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requestedWorkspaces = args.filter((arg) => arg !== '--dry-run');

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const readPackage = (dir) => readJson(join(dir, 'package.json'));

const workspaces = [];
for (const root of workspaceRoots) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    const pkg = readPackage(dir);
    if (pkg.private || !pkg.name || !pkg.version) continue;
    if (
      requestedWorkspaces.length > 0
      && !requestedWorkspaces.includes(pkg.name)
      && !requestedWorkspaces.includes(entry.name)
      && !requestedWorkspaces.includes(basename(dir))
    ) {
      continue;
    }
    workspaces.push({ dir, pkg });
  }
}

workspaces.sort((a, b) => {
  if (a.pkg.name === 'nizel') return -1;
  if (b.pkg.name === 'nizel') return 1;
  if (a.pkg.name === 'nizel-kit') return 1;
  if (b.pkg.name === 'nizel-kit') return -1;
  return a.pkg.name.localeCompare(b.pkg.name);
});

const bumpPatch = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!match) throw new Error(`Unsupported version format: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}${match[4]}`;
};

const publishedVersions = (name) => {
  const result = spawnSync('npm', ['view', name, 'versions', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    if (result.stderr.includes('E404') || result.stderr.includes('404')) return new Set();
    throw new Error(`Could not read published versions for ${name}:\n${result.stderr}`);
  }

  const parsed = JSON.parse(result.stdout || '[]');
  return new Set(Array.isArray(parsed) ? parsed : [parsed]);
};

const nextUnpublishedVersion = (current, published) => {
  let version = current;
  while (published.has(version)) version = bumpPatch(version);
  return version;
};

let changed = false;
const changedVersions = new Map();

for (const workspace of workspaces) {
  const published = publishedVersions(workspace.pkg.name);
  const current = workspace.pkg.version;
  const next = nextUnpublishedVersion(current, published);

  if (next === current) {
    console.log(`${workspace.pkg.name}@${current} is unpublished; keeping version.`);
    continue;
  }

  workspace.pkg.version = next;
  if (!dryRun) writeJson(join(workspace.dir, 'package.json'), workspace.pkg);
  changedVersions.set(workspace.dir, next);
  changed = true;
  console.log(`${workspace.pkg.name}: ${current} -> ${next}${dryRun ? ' (dry run)' : ''}`);
}

if (changed && !dryRun) {
  const lockPath = 'package-lock.json';
  const lock = readJson(lockPath);
  for (const [dir, version] of changedVersions) {
    if (lock.packages?.[dir]) lock.packages[dir].version = version;
  }
  writeJson(lockPath, lock);
}

if (!changed) console.log('All workspace package versions are already unpublished.');

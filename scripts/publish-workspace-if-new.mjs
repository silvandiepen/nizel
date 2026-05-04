import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceName = process.argv[2];

if (!workspaceName) {
  console.error('Usage: node scripts/publish-workspace-if-new.mjs <workspace-package-name>');
  process.exit(1);
}

const workspaceRoots = ['packages', 'documentation'];

const readPackage = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));

const findWorkspace = () => {
  for (const root of workspaceRoots) {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;

      const dir = join(root, entry.name);
      const pkg = readPackage(dir);
      if (pkg.name === workspaceName || entry.name === workspaceName || basename(dir) === workspaceName) {
        return { dir, pkg };
      }
    }
  }

  throw new Error(`Workspace not found: ${workspaceName}`);
};

const { pkg } = findWorkspace();
const spec = `${pkg.name}@${pkg.version}`;
const view = spawnSync('npm', ['view', spec, 'version', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (view.status === 0) {
  console.log(`${spec} already exists; skipping publish.`);
  process.exit(0);
}

console.log(`${spec} is not published yet; publishing.`);
const publish = spawnSync(
  'npm',
  ['publish', '--workspace', pkg.name, '--access', 'public', '--provenance'],
  { stdio: 'inherit' },
);

process.exit(publish.status ?? 1);

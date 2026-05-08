import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const workspaceName = process.argv[2];

if (!workspaceName) {
  console.error('Usage: node scripts/publish-workspace-if-new.mjs <workspace-package-name>');
  process.exit(1);
}

const workspaceRoots = ['packages', 'documentation'];

const readPackage = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const writePackage = (dir, pkg) => writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');

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

const bumpPatch = (version) => {
  const parts = version.split('.');
  parts[2] = Number(parts[2]) + 1;
  return parts.join('.');
};

const { dir, pkg } = findWorkspace();

// Check if the current version is already published
const spec = `${pkg.name}@${pkg.version}`;
const view = spawnSync('npm', ['view', spec, 'version', '--json'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});

if (view.status === 0) {
  // Already published — bump patch version
  const newVersion = bumpPatch(pkg.version);
  pkg.version = newVersion;
  writePackage(dir, pkg);
  console.log(`${pkg.name}: bumped ${spec} → ${newVersion}`);
} else {
  console.log(`${spec} is not published yet; publishing as-is.`);
}

const publish = spawnSync(
  'npx',
  ['-y', 'npm@11.5.1', 'publish', '--workspace', pkg.name, '--access', 'public', '--provenance'],
  { stdio: 'inherit' },
);

process.exit(publish.status ?? 1);

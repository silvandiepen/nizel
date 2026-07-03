import { basename, join } from 'node:path';
import {
  listWorkspaces,
  workspaceDeps,
  publishedVersions,
  nextUnpublishedVersion,
  latestTagFor,
  hasChangesSince,
  topologicalOrder,
  writeJson,
  readJson,
} from './workspace-utils.mjs';

const PLAN_PATH = '.publish-plan';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const requestedWorkspaces = args.filter((arg) => arg !== '--dry-run');

const all = listWorkspaces().filter(({ pkg, dir }) =>
  requestedWorkspaces.length === 0
  || requestedWorkspaces.includes(pkg.name)
  || requestedWorkspaces.includes(basename(dir)),
);

const knownNames = new Set(all.map(({ pkg }) => pkg.name));
const byName = new Map(all.map((w) => [w.pkg.name, w]));

const workspaces = new Map();
for (const w of all) {
  workspaces.set(w.pkg.name, {
    ...w,
    published: publishedVersions(w.pkg.name),
    tag: latestTagFor(w.pkg.name),
    reason: null,
    publish: false,
    target: w.pkg.version,
  });
}

const order = topologicalOrder(all, knownNames);

for (const name of order) {
  const w = workspaces.get(name);
  if (!w.tag) {
    if (w.published.has(w.pkg.version)) {
      w.reason = 'baseline';
      continue;
    }
    w.publish = true;
    w.reason = w.published.size === 0 ? 'new' : 'unpublished';
    continue;
  }

  if (!w.published.has(w.pkg.version)) {
    w.publish = true;
    w.reason = 'unpublished';
    continue;
  }

  if (hasChangesSince(w.tag.tag, w.dir)) {
    w.publish = true;
    w.reason = 'changed';
  }
}

for (const name of order) {
  const w = workspaces.get(name);
  if (w.publish || w.reason === 'baseline') continue;
  const trigger = workspaceDeps(w.pkg, knownNames).find((dep) => byName.has(dep) && workspaces.get(dep).publish);
  if (trigger) {
    w.publish = true;
    w.reason = `dep:${trigger}`;
  }
}

const plan = [];
let wroteFiles = false;
const changedVersions = new Map();

for (const name of order) {
  const w = workspaces.get(name);
  if (!w.publish) {
    console.log(`${name}: no changes; skip`);
    continue;
  }

  const target = w.published.has(w.pkg.version)
    ? nextUnpublishedVersion(w.pkg.version, w.published)
    : w.pkg.version;

  plan.push({ name, version: target, reason: w.reason });

  if (target !== w.pkg.version) {
    w.pkg.version = target;
    if (!dryRun) writeJson(join(w.dir, 'package.json'), w.pkg);
    changedVersions.set(w.dir, target);
    wroteFiles = true;
  }
  console.log(`${name}: ${w.reason} -> ${target}${dryRun ? ' (dry run)' : ''}`);
}

if (wroteFiles && !dryRun) {
  const lockPath = 'package-lock.json';
  const lock = readJson(lockPath);
  for (const [dir, version] of changedVersions) {
    if (lock.packages?.[dir]) lock.packages[dir].version = version;
  }
  writeJson(lockPath, lock);
}

if (plan.length > 0) {
  if (!dryRun) {
    writeJson(PLAN_PATH, plan);
  }
  console.log(`\nPublish plan:${dryRun ? ' (dry run)' : ''}`);
  for (const entry of plan) console.log(`  ${entry.name}@${entry.version} (${entry.reason})`);
} else {
  console.log('\nNo packages need publishing.');
}

import { existsSync, readFileSync, appendFileSync } from 'node:fs';
import { basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { listWorkspaces, publishedVersions, tagFor, tagExists, readJson } from './workspace-utils.mjs';

const PLAN_PATH = '.publish-plan';
const TAG_PLAN_PATH = '.tag-plan';

const workspaceName = process.argv[2];
const provenance = process.env.NPM_PROVENANCE !== 'false';

if (!workspaceName) {
  console.error('Usage: node scripts/publish-workspace-if-new.mjs <workspace-package-name>');
  process.exit(1);
}

const findWorkspace = () => {
  for (const w of listWorkspaces()) {
    if (w.pkg.name === workspaceName || basename(w.dir) === workspaceName) return w;
  }
  throw new Error(`Workspace not found: ${workspaceName}`);
};

const readPublishPlan = () => {
  if (!existsSync(PLAN_PATH)) return null;
  const entries = readJson(PLAN_PATH);
  const map = new Map();
  for (const entry of entries) map.set(entry.name, entry.version);
  return map;
};

const recordTag = (tag) => {
  appendFileSync(TAG_PLAN_PATH, `${tag}\n`);
};

const { pkg } = findWorkspace();
const name = pkg.name;
const version = pkg.version;
const tag = tagFor(name, version);

const published = publishedVersions(name);
const isPublished = published.has(version);
const plan = readPublishPlan();

const inPlan = plan ? plan.has(name) && plan.get(name) === version : null;
const shouldPublish = plan ? inPlan === true : !isPublished;

if (shouldPublish && !isPublished) {
  console.log(`${name}@${version} is not published yet; publishing.`);
  const publish = spawnSync(
    'npx',
    [
      '-y',
      'npm@11.5.1',
      'publish',
      '--workspace',
      name,
      '--access',
      'public',
      ...(provenance ? ['--provenance'] : ['--provenance=false']),
    ],
    { stdio: 'inherit' },
  );
  if (publish.status !== 0) process.exit(publish.status ?? 1);
  recordTag(tag);
} else {
  if (shouldPublish && isPublished) {
    console.log(`${name}@${version} already published; skipping publish.`);
  } else if (plan) {
    console.log(`${name}@${version} not in publish plan; skipping.`);
  } else {
    console.log(`${name}@${version} already exists; skipping publish.`);
  }
  if (isPublished && !tagExists(tag)) {
    recordTag(tag);
    console.log(`${name}: recorded baseline tag ${tag}.`);
  }
}

process.exit(0);

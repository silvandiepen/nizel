import { existsSync, readFileSync, unlinkSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const PLAN_PATH = '.publish-plan';
const TAG_PLAN_PATH = '.tag-plan';

if (!existsSync(TAG_PLAN_PATH)) {
  console.log('No publish tags to create.');
  if (existsSync(PLAN_PATH)) unlinkSync(PLAN_PATH);
  process.exit(0);
}

const tags = readFileSync(TAG_PLAN_PATH, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const unique = [...new Set(tags)];

if (unique.length === 0) {
  console.log('No publish tags to create.');
  unlinkSync(TAG_PLAN_PATH);
  if (existsSync(PLAN_PATH)) unlinkSync(PLAN_PATH);
  process.exit(0);
}

const created = [];
const existing = [];

for (const tag of unique) {
  const check = spawnSync('git', ['tag', '-l', tag], { encoding: 'utf8' });
  if (check.status === 0 && check.stdout.trim() === tag) {
    existing.push(tag);
    continue;
  }

  const make = spawnSync('git', ['tag', tag, 'HEAD'], { encoding: 'utf8' });
  if (make.status !== 0) {
    console.error(`Failed to create tag ${tag}:\n${make.stderr}`);
    process.exit(1);
  }
  created.push(tag);
}

if (created.length > 0) {
  const push = spawnSync('git', ['push', 'origin', ...created], { stdio: 'inherit' });
  if (push.status !== 0) {
    console.error('Failed to push publish tags.');
    process.exit(push.status ?? 1);
  }
}

console.log(`Publish tags:${created.length ? ` created ${created.join(', ')}` : ' none new'}${existing.length ? `; existing ${existing.join(', ')}` : ''}`);

unlinkSync(TAG_PLAN_PATH);
if (existsSync(PLAN_PATH)) unlinkSync(PLAN_PATH);

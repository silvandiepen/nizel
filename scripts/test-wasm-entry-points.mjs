// Runs every workspace's test suite with the WebAssembly entry points
// aliased in (vitest.wasm.config.mjs). Exits non-zero if any suite fails.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const config = fileURLToPath(new URL('../vitest.wasm.config.mjs', import.meta.url));
let failed = 0;
for (const name of readdirSync(new URL('../packages/', import.meta.url))) {
  const dir = `${root}packages/${name}`;
  if (!existsSync(`${dir}/test`)) continue;
  const run = spawnSync(process.execPath, [`${root}node_modules/vitest/vitest.mjs`, 'run', '--config', config, '--root', dir], { encoding: 'utf8', env: { ...process.env, NIZEL_WASM_PACKAGE: name } });
  const summary = (run.stdout + run.stderr).match(/Tests +\d+[^\n]*/)?.[0] ?? 'no summary';
  console.log(`${run.status === 0 ? 'ok  ' : 'FAIL'} ${name}: ${summary}`);
  if (run.status !== 0) {
    failed += 1;
    console.log((run.stdout + run.stderr).split('\n').filter((l) => /FAIL|AssertionError|Error:/.test(l)).slice(0, 12).join('\n'));
  }
}
process.exitCode = failed ? 1 : 0;

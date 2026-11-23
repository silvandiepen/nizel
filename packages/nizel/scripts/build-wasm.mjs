import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const output = new URL('../dist/wasm/', import.meta.url);
await mkdir(output, { recursive: true });
// The Rust engine (packages/nizel/engine). CARGO overrides the binary;
// otherwise rustup's default install location is used when cargo is not on
// PATH (as in git hooks started from a GUI).
const engine = new URL('../engine/', import.meta.url);
const rustupCargo = join(homedir(), '.cargo', 'bin', 'cargo');
const cargo = process.env.CARGO ?? (existsSync(rustupCargo) ? rustupCargo : 'cargo');
execFileSync(cargo, ['build', '--release', '--target', 'wasm32-unknown-unknown', '--manifest-path', fileURLToPath(new URL('Cargo.toml', engine))], { stdio: 'inherit' });
const built = new URL('target/wasm32-unknown-unknown/release/nizel_engine.wasm', engine);
const optimized = new URL('engine.wasm', output);
execFileSync(process.execPath, [
  require.resolve('binaryen/bin/wasm-opt'),
  fileURLToPath(built),
  '-O3',
  '--enable-bulk-memory',
  '--enable-nontrapping-float-to-int',
  '--enable-sign-ext',
  '--enable-mutable-globals',
  '--enable-simd',
  '-o', fileURLToPath(optimized),
], { stdio: 'inherit' });
await writeFile(new URL('engine-bytes.js', output), 'export default ' + JSON.stringify((await readFile(optimized)).toString('base64')) + ';\n');

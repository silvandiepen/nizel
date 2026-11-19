import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const output = new URL('../dist/wasm/', import.meta.url);
const binary = new URL('renderer.wasm', output);
const source = new URL('../assembly/renderer.ts', import.meta.url);
await mkdir(output, { recursive: true });
execFileSync(process.execPath, [
  require.resolve('assemblyscript/bin/asc.js'),
  fileURLToPath(source),
  '--runtime', 'stub',
  '--optimize',
  '--noAssert',
  '--outFile', fileURLToPath(binary),
], { stdio: 'inherit' });
const encoded = (await readFile(binary)).toString('base64');
await writeFile(new URL('bytes.js', output), 'export default ' + JSON.stringify(encoded) + ';\n');

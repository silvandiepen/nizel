import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import * as stock from 'nizel';
import * as wasm from 'nizel/wasm';
import { renderWasm, reverseWasm } from '../../../../packages/nizel/dist/wasm/backend.js';

const options = { plugins: [], frontmatter: false, template: false };
const plain = stock.useNizel(options);
const fast = wasm.useNizel(options);
const fixtures = Object.fromEntries(await Promise.all(
  ['commonmark', 'gfm', 'readme', 'large', 'code-heavy'].map(async name =>
    [name, await readFile(new URL('../../fixtures/' + name + '.md', import.meta.url), 'utf8')]),
));
fixtures['46 KB GFM'] = fixtures.gfm.repeat(82);
fixtures['emphasis draft'] = 'This is a required **bold passage** with *emphasis* in the same line.\n\n'.repeat(800);
fixtures['plain draft'] = 'First paragraph with simple notes.\n\nSecond paragraph with a useful addition.\n\n'.repeat(700);
// Real documents (frozen copies, see fixtures/realistic/README.md).
for (const name of ['readmes', 'documentation', 'tables', 'nested-lists']) {
  fixtures[`realistic ${name}`] = await readFile(new URL('../../fixtures/realistic/' + name + '.md', import.meta.url), 'utf8');
}

/** Process CPU time in ms: unlike wall time, it does not count waiting for a core on a loaded machine. */
const cpuNow = () => {
  const usage = process.cpuUsage();
  return (usage.user + usage.system) / 1000;
};

async function medianRender(input, engines) {
  const wall = [[], []];
  const cpu = [[], []];
  const repeats = Math.max(1, Math.min(100, Math.ceil(30000 / input.length)));
  for (let round = 0; round < 24; round++) {
    for (let offset = 0; offset < 2; offset++) {
      const index = (round + offset) % 2;
      const start = performance.now();
      const cpuStart = cpuNow();
      for (let i = 0; i < repeats; i++) await engines[index](input);
      if (round >= 6) {
        wall[index].push((performance.now() - start) / repeats);
        cpu[index].push((cpuNow() - cpuStart) / repeats);
      }
    }
  }
  const median = samples => samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  return [...wall.map(median), ...cpu.map(median)].map(value => value.toFixed(3));
}

console.log('direction | fixture | bytes | route | JavaScript ms | opt-in ms | JavaScript CPU ms | opt-in CPU ms | CPU speedup');
for (const [name, markdown] of Object.entries(fixtures)) {
  const html = await plain.html(markdown);
  assert.equal(await fast.html(markdown), html, name);
  assert.equal(wasm.htmlToMarkdown(html), stock.htmlToMarkdown(html), name);
  const directions = [
    ['forward', markdown, renderWasm(markdown, options), [plain.html, fast.html]],
    ['reverse', html, reverseWasm(html), [stock.htmlToMarkdown, wasm.htmlToMarkdown]],
  ];
  for (const [direction, input, supported, engines] of directions) {
    const medians = await medianRender(input, engines);
    const speedup = (Number(medians[2]) / Number(medians[3])).toFixed(1) + 'x';
    console.log([direction, name, Buffer.byteLength(input), supported === undefined ? 'fallback' : 'Wasm', ...medians, speedup].join(' | '));
  }
}

// Cold start: a fresh process, timing the first conversion (the engine is
// decoded, compiled and instantiated lazily on first use), median of 9.
const coldStart = (entry) => {
  const code = `const t = performance.now(); const m = await import('${entry}'); const i = performance.now(); await m.useNizel({ plugins: [], frontmatter: false, template: false }).html('# Cold\\n\\nA *first* call.'); process.stdout.write(JSON.stringify([i - t, performance.now() - i]));`;
  const runs = Array.from({ length: 9 }, () => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' })));
  const median = (values) => values.sort((a, b) => a - b)[4].toFixed(1);
  return [median(runs.map((r) => r[0])), median(runs.map((r) => r[1]))];
};
const [jsImport, jsFirst] = coldStart('nizel');
const [wasmImport, wasmFirst] = coldStart('nizel/wasm');
console.log(`cold start (Node, median of 9 fresh processes): import ${jsImport} ms + first call ${jsFirst} ms (JavaScript); import ${wasmImport} ms + first call ${wasmFirst} ms (Wasm: decode, compile, instantiate, convert)`);

const binary = await readFile(new URL('../../../../packages/nizel/dist/wasm/engine.wasm', import.meta.url));
console.log(`engine.wasm: ${binary.length} bytes, ${gzipSync(binary, { level: 9 }).length} bytes gzipped (budget 300 KB gzipped)`);

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

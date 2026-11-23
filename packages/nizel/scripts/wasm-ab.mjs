// A/B two engine builds in one process, interleaved, by CPU time: the way to
// compare a change on a loaded machine (an engine against itself varies by
// about ±9% per fixture at load ~350).
//
//   node scripts/wasm-ab.mjs old.wasm new.wasm file.md:render file.html:reverse ...
import { readFile } from 'node:fs/promises';
const [, , a, b, ...files] = process.argv;
const load = async (p) => { const { instance } = await WebAssembly.instantiate(await readFile(p), { env: { claim: () => -1 } }); return instance.exports; };
const engines = [await load(a), await load(b)];
const enc = new TextEncoder();
const cpu = () => { const u = process.cpuUsage(); return (u.user + u.system) / 1000; };
for (const file of files) {
  const [path, mode] = file.split(':');
  const text = await readFile(path, 'utf8');
  const bytes = enc.encode(text);
  const run = (e) => { const at = e.input(bytes.length); new Uint8Array(e.memory.buffer, at, bytes.length).set(bytes); return e[mode](bytes.length, mode === 'render' ? 7 : 0); };
  const reps = Math.max(3, Math.ceil(300000 / bytes.length));
  const t = [[], []];
  for (let r = 0; r < 40; r++) for (const i of r % 2 ? [0, 1] : [1, 0]) { const s = cpu(); for (let k = 0; k < reps; k++) run(engines[i]); if (r > 5) t[i].push((cpu() - s) / reps); }
  const med = (x) => x.sort((p, q) => p - q)[x.length >> 1];
  const [o, n] = t.map(med);
  console.log(`${path.split('/').pop().padEnd(22)} ${mode.padEnd(7)} old ${o.toFixed(4)} new ${n.toFixed(4)} ms  ${((o / n - 1) * 100).toFixed(1)}%`);
}

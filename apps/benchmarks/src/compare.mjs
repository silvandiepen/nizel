// Markdown → HTML throughput against @pierre/words, md4x, markdown-it and
// marked: input MiB per CPU second (median of interleaved rounds).
//
//   npm run compare             every engine interleaved per round
//   npm run compare -- --pairs  Nizel's Wasm engine against Words alone, warmed
//
// The interleaved table runs ten engines in one process, so garbage the
// JavaScript ones leave is collected in whichever slot comes next; --pairs
// measures each Nizel/Words pair on its own. Both are reported.
import { readFile } from 'node:fs/promises';
import MarkdownIt from 'markdown-it';
import { marked } from 'marked';
import * as words from '@pierre/words';
import * as md4xNapi from 'md4x/napi';
import * as md4xWasm from 'md4x/wasm';

const nizel = new URL('../../../packages/nizel/dist/', import.meta.url);
const stock = await import(new URL('index.js', nizel));
const wasm = await import(new URL('wasm.js', nizel));
const { renderWasm } = await import(new URL('wasm/backend.js', nizel));

const fixtures = new URL('../fixtures/', import.meta.url);
const docs = {
  'tier-1 subset of documentation 102 KiB': 'realistic/tier1-subset.md',
  'AI code review 5.2 KiB': 'realistic/ai-review.md',
  'readme 1 KiB': 'readme.md',
  'READMEs 61 KiB': 'realistic/readmes.md',
  'documentation 181 KiB': 'realistic/documentation.md',
  'CommonMark spec 44 KiB': 'commonmark.md',
};

if (md4xWasm.init) await md4xWasm.init();
const md = new MarkdownIt();
const options = { plugins: [], frontmatter: false, template: false };
const nizelJs = stock.useNizel(options);
const nizelWasm = wasm.useNizel(options);
const decoder = new TextDecoder();
const bare = { anchors: false, autolinks: false, safe: false };

const engines = {
  'Nizel Wasm engine, bare options': (s) => renderWasm(s, bare),
  'Words (bytes)': (s) => words.renderToHtml(s),
  'Words (string)': (s) => decoder.decode(words.renderToHtml(s)),
  'md4x (NAPI)': (s) => md4xNapi.renderToHtml(s),
  'md4x (Wasm)': (s) => md4xWasm.renderToHtml(s),
  'Nizel Wasm engine': (s) => renderWasm(s, {}),
  'Nizel nizel/wasm': (s) => nizelWasm.html(s),
  'Nizel JavaScript': (s) => nizelJs.html(s),
  'markdown-it': (s) => md.render(s),
  marked: (s) => marked.parse(s),
};

const cpu = () => {
  const usage = process.cpuUsage();
  return (usage.user + usage.system) / 1e6;
};
const median = (values) => values.sort((a, b) => a - b)[values.length >> 1];
const mib = (bytes, seconds) => (bytes / 1048576 / seconds).toFixed(1);

/** Median seconds per call for each engine, run interleaved, alternating order. */
const measure = async (fns, text, rounds, warmup) => {
  const names = Object.keys(fns);
  const reps = Math.max(3, Math.ceil(2_000_000 / Buffer.byteLength(text)));
  for (const name of names) for (let i = 0; i < warmup; i++) await fns[name](text);
  const samples = Object.fromEntries(names.map((name) => [name, []]));
  for (let round = 0; round < rounds; round++) {
    for (const name of round % 2 ? [...names].reverse() : names) {
      const start = cpu();
      for (let i = 0; i < reps; i++) await fns[name](text);
      samples[name].push((cpu() - start) / reps);
    }
  }
  return Object.fromEntries(names.map((name) => [name, median(samples[name])]));
};

const texts = {};
for (const [name, path] of Object.entries(docs)) texts[name] = await readFile(new URL(path, fixtures), 'utf8');

if (process.argv.includes('--pairs')) {
  const pair = { 'Nizel Wasm engine, bare options': engines['Nizel Wasm engine, bare options'], 'Words (string)': engines['Words (string)'] };
  console.log('document | Nizel bare | Words (string) | Nizel / Words');
  for (const [name, text] of Object.entries(texts)) {
    const bytes = Buffer.byteLength(text);
    await measure(pair, text, 30, 200);
    const times = await measure(pair, text, 21, 0);
    const [nizelTime, wordsTime] = Object.values(times);
    console.log(`${name} | ${mib(bytes, nizelTime)} | ${mib(bytes, wordsTime)} | ${(wordsTime / nizelTime).toFixed(2)}`);
  }
} else {
  const names = Object.keys(engines);
  console.log(['document', ...names].join(' | '));
  for (const [name, text] of Object.entries(texts)) {
    const bytes = Buffer.byteLength(text);
    const times = await measure(engines, text, 15, 50);
    console.log([name, ...names.map((engine) => mib(bytes, times[engine]))].join(' | '));
  }
}

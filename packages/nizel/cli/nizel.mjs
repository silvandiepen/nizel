#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { useNizel } from '../dist/index.js';

const HELP = `Usage: npx nizel <input.md> [options]

Options:
  -o, --output <file>  Write HTML to a file instead of stdout
  --fragment           Output the rendered HTML fragment only (default)
  --document           Wrap output in a complete HTML document
  --title <title>      Override the document title used with --document
  -h, --help           Show this help
  -v, --version        Show the installed Nizel version

Examples:
  npx nizel report.md
  npx nizel report.md -o report.html --document
  cat report.md | npx nizel - --document > report.html
`;

function parseArgs(argv) {
  const options = { input: null, output: null, document: false, title: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-h' || arg === '--help') return { ...options, help: true };
    if (arg === '-v' || arg === '--version') return { ...options, version: true };
    if (arg === '--document') { options.document = true; continue; }
    if (arg === '--fragment') { options.document = false; continue; }
    if (arg === '-o' || arg === '--output') { options.output = argv[++index]; continue; }
    if (arg === '--title') { options.title = argv[++index]; continue; }
    if (arg.startsWith('-') && arg !== '-') throw new Error(`Unknown option: ${arg}`);
    if (options.input) throw new Error('Only one input file is supported.');
    options.input = arg;
  }
  return options;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapDocument(html, title) {
  return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escapeHtml(title || 'Nizel document')}</title>\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { process.stdout.write(HELP); return; }
  if (options.version) {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    process.stdout.write(`${pkg.version}\n`);
    return;
  }
  if (!options.input) throw new Error(`Missing input file.\n\n${HELP}`);

  const markdown = options.input === '-' ? await readStdin() : await readFile(options.input, 'utf8');
  const rendered = await useNizel()(markdown);
  const html = options.document
    ? wrapDocument(rendered.html, options.title || rendered.title || rendered.meta?.title)
    : rendered.html;

  if (options.output) await writeFile(options.output, html, 'utf8');
  else process.stdout.write(html.endsWith('\n') ? html : `${html}\n`);
}

main().catch((error) => {
  process.stderr.write(`nizel: ${error.message}\n`);
  process.exitCode = 1;
});

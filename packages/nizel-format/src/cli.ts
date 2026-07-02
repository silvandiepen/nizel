#!/usr/bin/env node
import { constants } from 'node:fs';
import { access, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { formatMarkdown, type MarkdownFormatOptions } from './index.js';

type CliOptions = {
  check: boolean;
  help: boolean;
  paths: string[];
  stdin: boolean;
  stdout: boolean;
  version: boolean;
  format: MarkdownFormatOptions;
};

type FormatResult = {
  changed: boolean;
  file: string;
};

const markdownExtensions = new Set(['.md', '.markdown', '.mdown', '.mkd']);

/**
 * Runs the nizel-format command line interface.
 */
export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const options = parseArgs(argv);

  if (options.help) {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }

  if (options.version) {
    process.stdout.write(`${await packageVersion()}\n`);
    return 0;
  }

  if (options.stdin) {
    const input = await readStdin();
    process.stdout.write(formatMarkdown(input, options.format));
    return 0;
  }

  if (options.paths.length === 0) {
    process.stderr.write('nizel-format: missing file or directory path\n\n');
    process.stderr.write(`${helpText()}\n`);
    return 1;
  }

  const files = await collectFiles(options.paths);
  if (files.length === 0) {
    process.stderr.write('nizel-format: no Markdown files found\n');
    return 1;
  }

  if (options.stdout && files.length !== 1) {
    process.stderr.write('nizel-format: --stdout requires exactly one input file\n');
    return 1;
  }

  const results: FormatResult[] = [];
  for (const file of files) {
    results.push(await formatFile(file, options));
  }

  const changed = results.filter((result) => result.changed);
  if (options.check) {
    for (const result of changed) process.stdout.write(`${result.file}\n`);
    return changed.length > 0 ? 1 : 0;
  }

  if (!options.stdout) {
    for (const result of changed) process.stdout.write(`${result.file}\n`);
  }

  return 0;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    check: false,
    help: false,
    paths: [],
    stdin: false,
    stdout: false,
    version: false,
    format: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      options.paths.push(...argv.slice(index + 1));
      break;
    }

    if (!arg.startsWith('-')) {
      options.paths.push(arg);
      continue;
    }

    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '-v' || arg === '--version') options.version = true;
    else if (arg === '--check') options.check = true;
    else if (arg === '--write') options.check = false;
    else if (arg === '--stdin') options.stdin = true;
    else if (arg === '--stdout') options.stdout = true;
    else if (arg === '--no-tables') options.format.tables = false;
    else if (arg === '--no-heading-spacing') options.format.headingSpacing = false;
    else if (arg === '--no-blank-lines') options.format.blankLines = false;
    else if (arg === '--no-renumber-ordered-lists') options.format.renumberOrderedLists = false;
    else if (arg === '--no-blockquote-spacing') options.format.blockquoteSpacing = false;
    else if (arg === '--no-html-inline-tags') options.format.htmlInlineTags = false;
    else if (arg === '--no-image-shortcodes') options.format.imageShortcodes = false;
    else if (arg === '--no-bbcode') options.format.bbcode = false;
    else if (arg.startsWith('--unordered-list-marker=')) {
      options.format.unorderedListMarker = enumValue(arg, ['-', '*', '+'] as const, '--unordered-list-marker');
    } else if (arg.startsWith('--nested-list-indent=')) {
      options.format.nestedListIndent = enumNumber(arg, [2, 4] as const, '--nested-list-indent');
    } else if (arg.startsWith('--code-fence-marker=')) {
      options.format.codeFenceMarker = enumValue(arg, ['```', '~~~'] as const, '--code-fence-marker');
    } else if (arg.startsWith('--horizontal-rule=')) {
      options.format.horizontalRule = enumValue(arg, ['---', '***', '___'] as const, '--horizontal-rule');
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.check && options.stdout) {
    throw new Error('--check cannot be combined with --stdout');
  }

  return options;
}

function enumValue<T extends string>(arg: string, values: readonly T[], name: string): T {
  const value = arg.slice(arg.indexOf('=') + 1) as T;
  if (values.includes(value)) return value;
  throw new Error(`${name} must be one of: ${values.join(', ')}`);
}

function enumNumber<T extends number>(arg: string, values: readonly T[], name: string): T {
  const value = Number(arg.slice(arg.indexOf('=') + 1)) as T;
  if (values.includes(value)) return value;
  throw new Error(`${name} must be one of: ${values.join(', ')}`);
}

async function collectFiles(paths: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const path of paths) {
    const resolved = resolve(path);
    await access(resolved, constants.R_OK);
    const entry = await stat(resolved);
    if (entry.isDirectory()) {
      files.push(...await collectDirectory(resolved));
    } else if (isMarkdownFile(resolved)) {
      files.push(resolved);
    }
  }
  return [...new Set(files)].sort();
}

async function collectDirectory(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectDirectory(path));
    else if (entry.isFile() && isMarkdownFile(path)) files.push(path);
  }
  return files;
}

function isMarkdownFile(path: string): boolean {
  return markdownExtensions.has(extname(path).toLowerCase());
}

async function formatFile(file: string, options: CliOptions): Promise<FormatResult> {
  const input = await readFile(file, 'utf8');
  const output = formatMarkdown(input, options.format);
  const changed = output !== input;

  if (options.stdout) {
    process.stdout.write(output);
  } else if (!options.check && changed) {
    await writeFile(file, output);
  }

  return { changed, file };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function packageVersion(): Promise<string> {
  const packageJsonUrl = new URL('../package.json', import.meta.url);
  const packageJson = JSON.parse(await readFile(packageJsonUrl, 'utf8')) as { version?: string };
  return packageJson.version ?? '0.0.0';
}

function helpText(): string {
  return `Usage: nizel-format [options] <file-or-directory...>

Formats Markdown files in place by default.

Options:
  --check                         List files that would change and exit 1 when any differ
  --stdout                        Print formatted output for one file instead of writing it
  --stdin                         Read Markdown from stdin and print formatted output
  --write                         Write files in place (default)
  --unordered-list-marker=<mark>  One of -, *, + (default: -)
  --nested-list-indent=<n>        One of 2, 4 (default: 2)
  --code-fence-marker=<mark>      One of \`\`\`, ~~~ (default: \`\`\`)
  --horizontal-rule=<rule>        One of ---, ***, ___ (default: ---)
  --no-tables                     Disable table alignment
  --no-heading-spacing            Disable heading marker spacing
  --no-blank-lines                Disable blank-line normalization
  --no-renumber-ordered-lists     Preserve ordered-list numbers
  --no-blockquote-spacing         Disable blockquote spacing
  --no-html-inline-tags           Disable inline HTML cleanup
  --no-image-shortcodes           Disable [img=url] conversion
  --no-bbcode                     Disable BBCode conversion
  -v, --version                   Print version
  -h, --help                      Print help

Examples:
  npx nizel-format notes.md
  npx nizel-format docs/
  npx nizel-format --check README.md docs/
  cat notes.md | npx nizel-format --stdin`;
}

if (isMainModule()) {
  runCli().then((code) => {
    process.exitCode = code;
  }).catch((error: unknown) => {
    process.stderr.write(`nizel-format: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

function isMainModule(): boolean {
  return process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
}

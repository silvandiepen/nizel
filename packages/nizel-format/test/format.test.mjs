import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'vitest';
import { formatMarkdown } from '../dist/index.js';

const cliPath = new URL('../dist/cli.js', import.meta.url);

test('formats pipe tables', () => {
  const markdown = `| Feature | Example | Notes |
|---|---|---|
| Bold | **Important** | Should render strongly |
| Code | \`const value = 1\` | Monospace |
| Link | [Visit](https://example.com) | Clickable |
| Strike | ~~Removed~~ | Optional in GFM |`;

  assert.equal(formatMarkdown(markdown), `| Feature | Example                      | Notes                  |
| ------- | ---------------------------- | ---------------------- |
| Bold    | **Important**                | Should render strongly |
| Code    | \`const value = 1\`            | Monospace              |
| Link    | [Visit](https://example.com) | Clickable              |
| Strike  | ~~Removed~~                  | Optional in GFM        |`);
});

test('preserves non-table markdown', () => {
  const markdown = `# Title

Paragraph with [link](https://example.com), ![alt](image.png), \`code | span\`, and \\*escaped\\* text.`;

  assert.equal(formatMarkdown(markdown), markdown);
});

test('preserves front matter content and trailing newline', () => {
  const markdown = `---
title: Table
---
| A | B |
|:---|---:|
| one | two |
`;

  assert.equal(formatMarkdown(markdown), `---
title: Table
---
| A   | B   |
| :-- | --: |
| one | two |
`);
});

test('supports escaped pipes and code span pipes', () => {
  const markdown = `| A | B |
|---|---|
| a\\|b | \`x | y\` |`;

  assert.equal(formatMarkdown(markdown), `| A    | B       |
| ---- | ------- |
| a\\|b | \`x | y\` |`);
});

test('normalizes headings, blockquotes, rules, fences, and blank lines', () => {
  const markdown = `Intro
##Title
>Quote
***
~~~ ts
const value = 1
~~~`;

  assert.equal(formatMarkdown(markdown), `Intro

## Title

> Quote

---

\`\`\` ts
const value = 1
\`\`\``);
});

test('normalizes unordered and ordered list markers', () => {
  const markdown = `* one
+ two
1. first
1. second
    7. nested
    3. nested again
1. third`;

  assert.equal(formatMarkdown(markdown), `- one
- two
1. first
2. second
    1. nested
    2. nested again
3. third`);
});

test('normalizes inline HTML tags and image shortcode outside code spans', () => {
  const markdown = `<strong>bold</strong> <b>also bold</b> <em>em</em> <i>italic</i> [img=https://example.com/image.png] \`<b>code</b> [img=x]\` <!-- <b>comment</b> -->`;

  assert.equal(formatMarkdown(markdown), `**bold** **also bold** _em_ _italic_ ![Alt](https://example.com/image.png) \`<b>code</b> [img=x]\` <!-- <b>comment</b> -->`);
});

test('normalizes common BBCode to Markdown outside code spans', () => {
  const markdown = `[b]bold[/b] [i]em[/i] [s]gone[/s] [url=https://example.com]Example[/url] [url]https://example.com[/url] [email]hi@example.com[/email] [img]https://example.com/a.png[/img] \`[b]code[/b]\``;

  assert.equal(formatMarkdown(markdown), `**bold** _em_ ~~gone~~ [Example](https://example.com) [https://example.com](https://example.com) [hi@example.com](mailto:hi@example.com) ![Alt](https://example.com/a.png) \`[b]code[/b]\``);
});

test('normalizes BBCode quote and strips presentational tags', () => {
  const markdown = `[color=red][u]Text[/u][/color]
[quote=Sil]hello
there[/quote]`;

  assert.equal(formatMarkdown(markdown), `Text

> Sil wrote:
> hello
> there`);
});

test('does not format inside fenced code', () => {
  const markdown = `\`\`\`md
##Title
* item
| A | B |
|---|---|
[b]bold[/b]
\`\`\``;

  assert.equal(formatMarkdown(markdown), `\`\`\` md
##Title
* item
| A | B |
|---|---|
[b]bold[/b]
\`\`\``);
});

test('cli formats stdin to stdout', () => {
  const child = spawnSync(process.execPath, [cliPath.pathname, '--stdin'], {
    input: '##Title\n',
    encoding: 'utf8',
  });

  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, '## Title\n');
});

test('cli formats a Markdown file in place by default', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nizel-format-'));
  const file = join(directory, 'notes.md');
  await writeFile(file, '##Title\n');

  const child = spawnSync(process.execPath, [cliPath.pathname, file], {
    encoding: 'utf8',
  });

  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /notes\.md/);
  assert.equal(await readFile(file, 'utf8'), '## Title\n');
});

test('cli check mode reports files that need formatting without writing', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nizel-format-'));
  const file = join(directory, 'notes.md');
  await writeFile(file, '##Title\n');

  const child = spawnSync(process.execPath, [cliPath.pathname, '--check', file], {
    encoding: 'utf8',
  });

  assert.equal(child.status, 1);
  assert.match(child.stdout, /notes\.md/);
  assert.equal(await readFile(file, 'utf8'), '##Title\n');
});

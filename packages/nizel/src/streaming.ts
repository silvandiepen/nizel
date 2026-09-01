import type { NizelStreamingOptions } from './types.js';

/** Completes common unfinished Markdown constructs so partial streams can render stably. */
export function completeStreamingMarkdown(source: string, options: NizelStreamingOptions = {}): string {
  if (!source) return source;
  let completed = source;

  if (options.frontmatter !== false && completed.startsWith('---\n') && !/^---\n[\s\S]*?\n---(?:\n|$)/.test(completed)) {
    return `${completed.replace(/\n*$/, '')}\n---`;
  }

  const openFence = findOpenCodeFence(completed);
  if (openFence) return `${completed.replace(/\n*$/, '')}\n${openFence}`;

  if (options.customBlocks !== false) {
    const customClosers = openCustomBlockClosers(completed);
    if (customClosers.length) completed = `${completed.replace(/\n*$/, '')}\n${customClosers.join('\n')}`;
  }

  completed += inlineClosers(completed);
  return completed;
}

/** Finds an opening code fence that has no compatible closing fence. */
function findOpenCodeFence(source: string): string | undefined {
  let open: { marker: string; length: number } | undefined;
  for (const line of source.split('\n')) {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) continue;
    const marker = match[1][0];
    if (!open) open = { marker, length: match[1].length };
    else if (marker === open.marker && match[1].length >= open.length && match[2].trim() === '') open = undefined;
  }
  return open?.marker.repeat(open.length);
}

/** Returns custom-block closing markers in innermost-first order. */
function openCustomBlockClosers(source: string): string[] {
  const stack: string[] = [];
  for (const line of source.split('\n')) {
    const match = /^(:{2,})(?:([A-Za-z][\w-]*)(?:\s|\{|$))?/.exec(line.trim());
    if (!match) continue;
    if (match[2]) stack.push(match[1]);
    else if (stack.length && match[1].length >= stack.at(-1)!.length) stack.pop();
  }
  return stack.reverse();
}

/** Produces closing delimiters for supported inline constructs on the final line. */
function inlineClosers(source: string): string {
  const lastLine = source.split('\n').at(-1) ?? '';
  if (/^ {0,3}(?:#{1,6}|>|[-+*]\s|\d+\.\s)/.test(lastLine)) return '';
  /** Checks whether the delimiter at an index is escaped. */
  const escaped = (index: number) => index > 0 && lastLine[index - 1] === '\\';
  let ticks = 0;
  let strong = 0;
  let strike = 0;
  for (let index = 0; index < lastLine.length; index += 1) {
    if (escaped(index)) continue;
    if (lastLine[index] === '`') ticks ^= 1;
    if (!ticks && lastLine.slice(index, index + 2) === '**') { strong ^= 1; index += 1; }
    else if (!ticks && lastLine.slice(index, index + 2) === '~~') { strike ^= 1; index += 1; }
  }
  const link = !ticks && /!?\[[^\]]*\]\([^)]*$/.test(lastLine);
  return `${link ? ')' : ''}${strike ? '~~' : ''}${strong ? '**' : ''}${ticks ? '`' : ''}`;
}

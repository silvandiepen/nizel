import { decodeStringContent } from './common.js';

/**
 * Creates a closing fence pattern for a fenced-code opener.
 */
export const openingFenceClosePattern = (line: string): RegExp | null => {
  const fence = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(line);
  if (!fence) return null;
  const marker = fence[2][0];
  return new RegExp(`^ {0,3}\\${marker}{${fence[2].length},}\\s*$`);
};

/**
 * Applies CommonMark whitespace normalization for code spans.
 */
export const normalizeCodeSpan = (code: string): string => {
  const normalized = code.replace(/\r?\n/g, ' ');
  return normalized.startsWith(' ') && normalized.endsWith(' ') && /[^ ]/.test(normalized)
    ? normalized.slice(1, -1)
    : normalized;
};

/**
 * Parses and decodes the info string of a fenced code block.
 */
export const parseFenceInfo = (info: string, marker: string): { lang?: string; meta: string; valid: boolean } => {
  const meta = decodeStringContent(info.trim());
  if (marker === '`' && meta.includes('`')) return { meta: '', valid: false };
  if (!meta) return { meta: '', valid: true };
  const [lang] = meta.split(/\s+/, 1);
  return { lang, meta, valid: true };
};

/**
 * Removes up to the opening fence indentation from fenced code content.
 */
export const stripFenceIndent = (line: string, indent: number): string => {
  let removed = 0;
  while (removed < indent && line.startsWith(' ')) {
    line = line.slice(1);
    removed += 1;
  }
  return line;
};

/**
 * Parses code fence metadata such as filename and highlighted line ranges.
 */
export const parseCodeMeta = (meta: string): { filename?: string; highlightLines?: number[] } => {
  const filename = /filename=(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(meta);
  const highlight = /\{([^}]+)\}/.exec(meta);
  return {
    filename: filename?.[1] ?? filename?.[2] ?? filename?.[3],
    highlightLines: highlight ? expandLineRanges(highlight[1]) : undefined,
  };
};

/**
 * Expands a comma-delimited line range expression into sorted line numbers.
 */
export const expandLineRanges = (source: string): number[] => {
  const lines = new Set<number>();
  for (const part of source.split(',')) {
    const [start, end] = part.trim().split('-').map(Number);
    if (!Number.isFinite(start)) continue;
    if (Number.isFinite(end)) {
      for (let line = start; line <= end; line += 1) lines.add(line);
    } else {
      lines.add(start);
    }
  }
  return [...lines].sort((a, b) => a - b);
};

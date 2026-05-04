/**
 * Extracts a leading YAML-like frontmatter block from Markdown.
 */
export const extractFrontmatter = (markdown: string): {
  markdown: string;
  frontmatter: Record<string, unknown>;
} => {
  if (!markdown.startsWith('---\n')) {
    return { markdown, frontmatter: {} };
  }

  const end = markdown.indexOf('\n---', 4);
  if (end === -1) {
    return { markdown, frontmatter: {} };
  }

  const raw = markdown.slice(4, end).trim();
  const rest = markdown.slice(end).replace(/^\n---\n?/, '').replace(/^\n/, '');

  return {
    markdown: rest,
    frontmatter: parseSimpleYaml(raw),
  };
};

/**
 * Parses the flat frontmatter subset supported by Nizel.
 */
const parseSimpleYaml = (raw: string): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const lines = raw.split('\n');
  let currentKey: string | null = null;
  let currentArray: unknown[] | null = null;

  for (const line of lines) {
    const listMatch = /^\s+-\s+(.*)$/.exec(line);
    if (listMatch && currentKey !== null) {
      if (!currentArray) currentArray = [];
      currentArray.push(parseValue(listMatch[1]));
      continue;
    }

    // Close any open array
    if (currentKey !== null && currentArray !== null) {
      result[currentKey] = currentArray;
      currentArray = null;
      currentKey = null;
    }

    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!match) continue;

    const [, key, rawValue] = match;
    if (rawValue.trim() === '') {
      // Key with no value — might start an array
      currentKey = key;
      currentArray = null;
    } else {
      result[key] = parseValue(rawValue);
      currentKey = null;
    }
  }

  // Close trailing array
  if (currentKey !== null && currentArray !== null) {
    result[currentKey] = currentArray;
  }

  return result;
};

/**
 * Coerces a frontmatter scalar into a JavaScript primitive.
 */
const parseValue = (value: string): unknown => {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, '');
};

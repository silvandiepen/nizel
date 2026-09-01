import type { NizelDocument, NizelResult, NizelRootNode } from './types.js';

export const NIZEL_DOCUMENT_SCHEMA = 'nizel/document' as const;
export const NIZEL_DOCUMENT_VERSION = 1 as const;

/** Creates the stable, transport-safe subset of a processed Nizel result. */
export function createNizelDocument<TMeta extends Record<string, unknown> = Record<string, unknown>>(
  value: NizelResult<unknown, TMeta> | NizelRootNode,
  meta?: TMeta,
): NizelDocument<TMeta> {
  const ast = isRoot(value) ? value : value.ast;
  const documentMeta = (isRoot(value) ? meta : value.meta) ?? ({} as TMeta);
  assertJsonValue(ast, 'ast');
  assertJsonValue(documentMeta, 'meta');
  return { schema: NIZEL_DOCUMENT_SCHEMA, version: NIZEL_DOCUMENT_VERSION, ast, meta: documentMeta };
}

/** Serializes a Nizel document after validating its schema and JSON safety. */
export function serializeNizelDocument(document: NizelDocument, space?: number): string {
  assertNizelDocument(document);
  return JSON.stringify(document, undefined, space);
}

/** Parses and validates a portable Nizel document. */
export function deserializeNizelDocument<TMeta extends Record<string, unknown> = Record<string, unknown>>(source: string): NizelDocument<TMeta> {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch (error) {
    throw new TypeError(`Invalid Nizel document JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  assertNizelDocument(value);
  return value as NizelDocument<TMeta>;
}

/** Validates the versioned envelope and the minimum AST contract. */
export function assertNizelDocument(value: unknown): asserts value is NizelDocument {
  if (!value || typeof value !== 'object') throw new TypeError('Nizel document must be an object.');
  const candidate = value as Partial<NizelDocument>;
  if (candidate.schema !== NIZEL_DOCUMENT_SCHEMA) throw new TypeError('Unsupported Nizel document schema.');
  if (candidate.version !== NIZEL_DOCUMENT_VERSION) throw new TypeError(`Unsupported Nizel document version: ${String(candidate.version)}.`);
  if (!isRoot(candidate.ast)) throw new TypeError('Nizel document ast must be a root node.');
  if (!candidate.meta || typeof candidate.meta !== 'object' || Array.isArray(candidate.meta)) {
    throw new TypeError('Nizel document meta must be an object.');
  }
  assertJsonValue(candidate, 'document');
}

/** Checks the minimum root-node shape without assuming trusted input. */
function isRoot(value: unknown): value is NizelRootNode {
  return Boolean(value && typeof value === 'object' && (value as NizelRootNode).type === 'root' && Array.isArray((value as NizelRootNode).children));
}

/** Recursively rejects values that JSON would drop, coerce, or fail to encode. */
function assertJsonValue(value: unknown, path: string, seen = new Set<object>()): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') throw new TypeError(`Nizel ${path} is not JSON-serializable.`);
  if (seen.has(value)) throw new TypeError(`Nizel ${path} contains a circular reference.`);
  seen.add(value);
  for (const [key, child] of Object.entries(value)) assertJsonValue(child, `${path}.${key}`, seen);
  seen.delete(value);
}

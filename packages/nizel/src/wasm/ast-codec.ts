import type { NizelBlockNode, NizelInlineNode, NizelRootNode } from '../types.js';

/**
 * Decodes the engine's binary AST (`engine/src/codec.rs`) into exactly the
 * objects `parseMarkdown` builds: the same node types, the same keys
 * (including keys whose value is undefined) in the same order. `restore`
 * turns lone-surrogate markers back into units.
 */
export function decodeAst(
  bytes: Uint8Array,
  onCustomBlock?: (node: { name: string; args: string[]; props: Record<string, unknown>; value: unknown }, content: string) => void,
  restore: (text: string) => string = text => text,
): NizelRootNode {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let at = 0;

  /** Reads one byte. */
  const u8 = (): number => bytes[at++];
  /** Reads a little-endian u32. */
  const u32 = (): number => {
    const value = view.getUint32(at, true);
    at += 4;
    return value;
  };
  /** Reads a little-endian f64. */
  const f64 = (): number => {
    const value = view.getFloat64(at, true);
    at += 8;
    return value;
  };
  /** Reads a length-prefixed UTF-8 string. */
  const str = (): string => {
    const length = u32();
    const value = restore(decoder.decode(bytes.subarray(at, at + length)));
    at += length;
    return value;
  };
  /** Reads a present-flag byte, then a string when present. */
  const optStr = (): string | undefined => (u8() ? str() : undefined);
  /** Reads a count, then that many items. */
  const list = <T>(item: () => T): T[] => {
    const count = u32();
    const items: T[] = new Array(count);
    for (let index = 0; index < count; index += 1) items[index] = item();
    return items;
  };

  /** Reads one inline node. */
  const inline = (): NizelInlineNode => {
    switch (u8()) {
      case 1: return { type: 'text', value: str() };
      case 2: return { type: 'lineBreak', hard: true };
      case 3: return { type: 'lineBreak', value: ' ' } as NizelInlineNode;
      case 4: return { type: 'inlineCode', code: str() };
      case 5: return { type: 'inlineHtml', value: str() };
      case 6: return { type: 'strong', children: list(inline) };
      case 7: return { type: 'emphasis', children: list(inline) };
      case 8: return { type: 'delete', children: list(inline) };
      case 9: {
        const href = str();
        const hasTitle = u8() === 1;
        const title = optStr();
        const external = u8() === 1;
        const children = list(inline);
        return (hasTitle
          ? { type: 'link', href, title, external, children }
          : { type: 'link', href, external, children }) as NizelInlineNode;
      }
      case 10: {
        const alt = str();
        const src = str();
        return { type: 'image', alt, src, title: optStr() };
      }
      default: throw new Error('Unknown inline node in engine AST');
    }
  };

  const align = ['left', 'center', 'right'] as const;
  /** Reads one block node. */
  const block = (): NizelBlockNode => {
    switch (u8()) {
      case 1: return { type: 'html', value: str() };
      case 2: {
        const name = str();
        const args = list(str);
        const props: Record<string, unknown> = {};
        const propCount = u32();
        for (let index = 0; index < propCount; index += 1) {
          const key = str();
          const kind = u8();
          props[key] = kind === 1 ? true : kind === 2 ? false : kind === 3 ? null : kind === 4 ? f64() : str();
        }
        const content = str();
        const node = { type: 'customBlock', name, args, props, value: undefined as unknown, children: [] as NizelBlockNode[] };
        // `parseBlocks` calls the block's `parse` before parsing its children.
        onCustomBlock?.(node, content);
        node.children = list(block);
        return node as NizelBlockNode;
      }
      case 3: {
        const code = str();
        const lang = optStr();
        const meta = optStr();
        const filename = optStr();
        const highlightLines = u8() ? list(f64) : undefined;
        return { type: 'code', code, lang, meta, filename, highlightLines };
      }
      case 4: return { type: 'code', code: str() };
      case 5: return { type: 'thematicBreak' };
      case 6: {
        const depth = u8() as 1 | 2 | 3 | 4 | 5 | 6;
        const text = str();
        const id = optStr();
        const node: Record<string, unknown> = { type: 'heading', depth, text, children: list(inline) };
        if (id !== undefined) node.id = id;
        return node as NizelBlockNode;
      }
      case 7: {
        const alignment = list(() => {
          const value = u8();
          return value === 0 ? null : align[value - 1];
        });
        const children = list(() => ({ type: 'tableRow' as const, children: list(() => ({ type: 'tableCell' as const, children: list(inline) })) }));
        return { type: 'table', align: alignment, children } as NizelBlockNode;
      }
      case 8: return { type: 'blockquote', children: list(block) };
      case 9: {
        const ordered = u8() === 1;
        const start = u8() ? f64() : undefined;
        const tight = u8() === 1;
        const children = list(() => {
          const checked = u8();
          return { type: 'listItem' as const, checked: checked === 0 ? undefined : checked === 2, children: list(block) };
        });
        return { type: 'list', ordered, start, tight, children } as NizelBlockNode;
      }
      case 10: return { type: 'paragraph', children: list(inline) };
      default: throw new Error('Unknown block node in engine AST');
    }
  };

  return { type: 'root', children: list(block) };
}

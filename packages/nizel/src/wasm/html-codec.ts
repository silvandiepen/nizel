import type { NizelHtmlDocNode, NizelHtmlElementNode } from '../types.js';

/**
 * Decodes an element subtree serialized by the engine (`encode_element` in
 * engine/src/reverse.rs) into exactly the nodes `parseHtml` builds.
 */
export function decodeHtmlElement(bytes: Uint8Array): NizelHtmlElementNode {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  let at = 0;
  /** Reads a little-endian u32. */
  const u32 = (): number => {
    const value = view.getUint32(at, true);
    at += 4;
    return value;
  };
  /** Reads a length-prefixed UTF-8 string. */
  const str = (): string => {
    const length = u32();
    const value = decoder.decode(bytes.subarray(at, at + length));
    at += length;
    return value;
  };
  /** Reads one node. */
  const node = (): NizelHtmlDocNode => {
    const kind = bytes[at++];
    if (kind === 2) return { type: 'text', value: str() };
    if (kind === 3) return { type: 'comment', value: str() };
    const tag = str();
    const attrs: Record<string, string> = {};
    const attrCount = u32();
    for (let index = 0; index < attrCount; index += 1) {
      const name = str();
      attrs[name] = str();
    }
    const raw = str();
    const element: NizelHtmlElementNode = { type: 'element', tag, attrs, children: [], raw };
    const childCount = u32();
    for (let index = 0; index < childCount; index += 1) element.children.push(node());
    return element;
  };
  return node() as NizelHtmlElementNode;
}

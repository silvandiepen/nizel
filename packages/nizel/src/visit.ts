import type { NizelNode } from './types.js';

export type NizelVisitControl = void | 'skip' | 'stop';

/** Walks a Nizel tree depth-first. Useful for renderers and content analysis. */
export function visitNizel(
  node: NizelNode,
  visitor: (node: NizelNode, parent?: NizelNode) => NizelVisitControl,
): void {
  let stopped = false;
  const walk = (current: NizelNode, parent?: NizelNode) => {
    if (stopped) return;
    const control = visitor(current, parent);
    if (control === 'stop') { stopped = true; return; }
    if (control === 'skip') return;
    const children = 'children' in current && Array.isArray(current.children) ? current.children : [];
    for (const child of children) walk(child as NizelNode, current);
  };
  walk(node);
}

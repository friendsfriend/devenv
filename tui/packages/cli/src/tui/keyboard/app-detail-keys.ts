import type { KeyboardEvent } from './types';
import type { AppDetailStore } from '../stores';

/**
 * Flatten visible tree nodes to compute flat index count and find node at index.
 */
function flattenTree(nodes: any[]): any[] {
  const result: any[] = [];
  function walk(list: any[]) {
    for (const n of list) {
      result.push(n);
      if (n.expanded && n.children.length > 0) walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

function nodeAtIndex(nodes: any[], index: number): any | null {
  const flat = flattenTree(nodes);
  return flat[index] ?? null;
}

export function handleAppDetailKeys(
  event: KeyboardEvent,
  appDetailStore: AppDetailStore,
  expandNode: (nodeKey: string) => void,
): boolean {
  const isTreeFocused = appDetailStore.dependencyTreeFocused();
  const app = appDetailStore.appDetailApp();
  if (!app) return false;

  // ── Tree focused keys ────────────────────────────────────────────────
  if (isTreeFocused) {
    const nodes = appDetailStore.dependencyTreeNodes();
    const flatCount = flattenTree(nodes).length;

    switch (event.name) {
      case 'j':
      case 'down': {
        const cur = appDetailStore.dependencyTreeSelectedIndex();
        if (cur < flatCount - 1) {
          appDetailStore.setDependencyTreeSelectedIndex(cur + 1);
        }
        return true;
      }
      case 'k':
      case 'up': {
        const cur = appDetailStore.dependencyTreeSelectedIndex();
        if (cur > 0) {
          appDetailStore.setDependencyTreeSelectedIndex(cur - 1);
        }
        return true;
      }
      case 'return': {
        // Expand/collapse selected node
        const idx = appDetailStore.dependencyTreeSelectedIndex();
        const found = nodeAtIndex(nodes, idx);
        if (found) expandNode(found.key);
        return true;
      }
      case 'escape': {
        appDetailStore.setDependencyTreeFocused(false);
        return true;
      }
    }
    return false;
  }

  // ── Main detail view keys ────────────────────────────────────────────
  switch (event.name) {
    case 'd': {
      // Focus dependency tree if deps exist
      if (appDetailStore.actionTargets().length > 0) {
        appDetailStore.setDependencyTreeFocused(true);
        appDetailStore.setDependencyTreeSelectedIndex(0);
        return true;
      }
      return false;
    }
  }

  return false;
}

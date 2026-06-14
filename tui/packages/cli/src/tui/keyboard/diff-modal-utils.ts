/**
 * Computes the initial split-view preference when opening the diff modal.
 *
 * Mirrors the logic in DiffViewModal's `isFileAddedOrDeleted` and `useSplitView` memos,
 * but evaluated once at open-time so the store always holds a concrete boolean — no null
 * "auto" state is needed at runtime.
 *
 *   - Entirely-added or entirely-deleted files → unified (false), side-by-side comparison
 *     makes no sense.
 *   - Otherwise → split when the terminal is wide enough (≥ 160 columns), staggered if not.
 */
export function computeInitialSplitView(diff: string, terminalWidth: number): boolean {
  let hasAdded = false;
  let hasRemoved = false;

  for (const line of diff.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) hasAdded = true;
    if (line.startsWith('-') && !line.startsWith('---')) hasRemoved = true;
    if (hasAdded && hasRemoved) break; // early exit — definitely not add-only / remove-only
  }

  const isFileAddedOrDeleted = (hasAdded && !hasRemoved) || (!hasAdded && hasRemoved);
  if (isFileAddedOrDeleted) return false;

  return terminalWidth >= 160;
}

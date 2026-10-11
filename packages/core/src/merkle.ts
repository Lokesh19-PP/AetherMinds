import { CoreError } from './errors.js';
import { nodeHash } from './hash.js';
import { PathStep } from './types.js';

export function buildTree(leaves: string[]): { root: string; levels: string[][] } {
  if (!leaves || leaves.length === 0) {
    throw new CoreError('EMPTY_TREE', 'Cannot build Merkle tree with 0 leaves');
  }

  const levels: string[][] = [[...leaves]];

  while (levels[levels.length - 1].length > 1) {
    const cur = levels[levels.length - 1];
    const next: string[] = [];

    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) {
        next.push(nodeHash(cur[i], cur[i + 1]));
      } else {
        // Promote odd un-paired node unchanged
        next.push(cur[i]);
      }
    }
    levels.push(next);
  }

  const root = levels[levels.length - 1][0];
  return { root, levels };
}

export function expectedPathLength(leafIndex: number, leafCount: number): number {
  if (leafIndex < 0 || leafIndex >= leafCount) {
    throw new CoreError('INDEX_OUT_OF_RANGE', `Index ${leafIndex} out of range [0, ${leafCount})`);
  }
  let steps = 0;
  let idx = leafIndex;
  let size = leafCount;

  while (size > 1) {
    if (idx % 2 === 1 || idx + 1 < size) {
      steps++;
    }
    idx = Math.floor(idx / 2);
    size = Math.ceil(size / 2);
  }
  return steps;
}

export function proofFor(
  arg1: number | string[] | string[][],
  arg2: number | string[] | string[][]
): PathStep[] {
  let leafIndex: number;
  let leavesOrLevels: string[] | string[][];

  if (typeof arg1 === 'number') {
    leafIndex = arg1;
    leavesOrLevels = arg2 as string[] | string[][];
  } else {
    leavesOrLevels = arg1;
    leafIndex = arg2 as number;
  }

  let levels: string[][];
  if (Array.isArray(leavesOrLevels[0])) {
    levels = leavesOrLevels as string[][];
  } else {
    levels = buildTree(leavesOrLevels as string[]).levels;
  }

  const leafCount = levels[0].length;
  if (leafIndex < 0 || leafIndex >= leafCount) {
    throw new CoreError('INDEX_OUT_OF_RANGE', `Leaf index ${leafIndex} out of bounds [0, ${leafCount})`);
  }

  const path: PathStep[] = [];
  let idx = leafIndex;

  for (let l = 0; l < levels.length - 1; l++) {
    const lvl = levels[l];
    const siblingIdx = idx ^ 1;

    if (siblingIdx < lvl.length) {
      path.push({
        hash: lvl[siblingIdx],
        side: siblingIdx < idx ? 'L' : 'R'
      });
    }
    idx >>= 1;
  }

  return path;
}

export function verifyPath(leaf: string, path: PathStep[]): string {
  let current = leaf;

  for (const step of path) {
    if (step.side === 'L') {
      current = nodeHash(step.hash, current);
    } else if (step.side === 'R') {
      current = nodeHash(current, step.hash);
    } else {
      throw new CoreError('INVALID_SIDE', `Invalid path side: ${step.side}`);
    }
  }

  return current;
}

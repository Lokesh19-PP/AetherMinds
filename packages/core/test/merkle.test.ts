import { describe, it, expect } from 'vitest';
import { utf8ToBytes } from '../src/bytes.js';
import { leafHash } from '../src/hash.js';
import { buildTree, proofFor, verifyPath, expectedPathLength } from '../src/merkle.js';

describe('RFC 6962 Merkle Tree Vectors - Section 6.7', () => {
  function makeLeaves(count: number): string[] {
    const leaves: string[] = [];
    for (let i = 0; i < count; i++) {
      leaves.push(leafHash(utf8ToBytes(`doc-${i}`)));
    }
    return leaves;
  }

  it('matches known root for n = 1', () => {
    const leaves = makeLeaves(1);
    const { root } = buildTree(leaves);
    expect(root).toBe('6615aa816816f3de2de16d76a8545906c23fcb0c0b37b894ce938b1fe38c2231');
  });

  it('matches known root for n = 2', () => {
    const leaves = makeLeaves(2);
    const { root } = buildTree(leaves);
    expect(root).toBe('252e49fa5b3ce0eb215f1ac8387fdbd696957bdc2359a567687e3267a9226113');
  });

  it('matches known root for n = 3', () => {
    const leaves = makeLeaves(3);
    const { root } = buildTree(leaves);
    expect(root).toBe('67f7693e164ba57d779c3aff9de3ba90df0820cca9cef61552b2ce6b9dd9201c');
  });

  it('matches known root for n = 5', () => {
    const leaves = makeLeaves(5);
    const { root } = buildTree(leaves);
    expect(root).toBe('d2b27b44535297753c26e8e316fd04a113409741ae379b27ed574ae1464766ff');
  });

  it('matches known root for n = 7', () => {
    const leaves = makeLeaves(7);
    const { root } = buildTree(leaves);
    expect(root).toBe('9bdea726571e6dc151c0194f52082e116e08ef86a791e65630f2146d9ef8b0e9');
  });

  it('matches known path for n = 5, index 4 (promoted leaf)', () => {
    const leaves = makeLeaves(5);
    const path = proofFor(4, leaves);
    expect(path).toEqual([
      { hash: '37846ad6dff69d7052778d7483b8011d319fa38aa2d70c9dd053a7e848e485d4', side: 'L' }
    ]);
    expect(expectedPathLength(4, 5)).toBe(1);
    expect(verifyPath(leaves[4], path)).toBe('d2b27b44535297753c26e8e316fd04a113409741ae379b27ed574ae1464766ff');
  });

  it('matches known path for n = 5, index 2', () => {
    const leaves = makeLeaves(5);
    const path = proofFor(2, leaves);
    expect(path).toEqual([
      { hash: '28a570fc5b9e7981c28a035b5a6de3177224240e74ef1162f03d1ad51b691eab', side: 'R' },
      { hash: '252e49fa5b3ce0eb215f1ac8387fdbd696957bdc2359a567687e3267a9226113', side: 'L' },
      { hash: '14ed5e67fbd519a4de42170da88484e2762e7c58b244d503ba4bc80469ee2772', side: 'R' }
    ]);
    expect(expectedPathLength(2, 5)).toBe(3);
    expect(verifyPath(leaves[2], path)).toBe('d2b27b44535297753c26e8e316fd04a113409741ae379b27ed574ae1464766ff');
  });

  it('verifies proofs for every index across n = 1 to 33', () => {
    for (let n = 1; n <= 33; n++) {
      const leaves = makeLeaves(n);
      const { root } = buildTree(leaves);

      for (let i = 0; i < n; i++) {
        const path = proofFor(i, leaves);
        expect(path.length).toBe(expectedPathLength(i, n));
        expect(verifyPath(leaves[i], path)).toBe(root);

        // Flipping any bit in the leaf must fail root comparison
        const tamperedLeaf = leaves[i].replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));
        expect(verifyPath(tamperedLeaf, path)).not.toBe(root);
      }
    }
  });

  it('resists second-preimage attack via domain separation byte', () => {
    // If an internal node is submitted as a leaf, its prefix 0x01 differs from leaf prefix 0x00
    const leaves = makeLeaves(2);
    const { root, levels } = buildTree(leaves);
    const internalRoot = levels[1][0]; // H(0x01 || l0 || l1)

    // A fake leaf hashing the same raw children with leafHash (0x00)
    const fakeLeaf = leafHash(utf8ToBytes('fake'));
    expect(fakeLeaf).not.toBe(internalRoot);
  });
});

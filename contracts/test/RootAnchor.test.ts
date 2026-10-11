/**
 * contracts/test/RootAnchor.test.ts
 * Hardhat / Mocha tests for the RootAnchor smart contract.
 *
 * Run: cd contracts && npx hardhat test
 *
 * Tests mirror section 20.3 of the project guide:
 *  Normal:      publish returns id 0/1/2; get; find; count; event emitted.
 *  Adversarial: non-publisher reverts; duplicate batchId reverts; zero root/
 *               leafCount/batchId reverts; get unknown id reverts; ABI has
 *               only append functions (no delete/update).
 */

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { RootAnchor } from '../typechain-types';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';

// Helpers ─────────────────────────────────────────────────────────────────────

/** Encode a 64-char lowercase hex string as bytes32 (no 0x prefix required). */
function hexToBytes32(hex: string): string {
  return '0x' + hex.padStart(64, '0');
}

/** Fake SHA-256 root: 32 bytes of incrementing value. */
function fakeRoot(n: number): string {
  return hexToBytes32(n.toString(16).padStart(64, '0').slice(0, 64));
}

// ─────────────────────────────────────────────────────────────────────────────

describe('RootAnchor', () => {
  let rootAnchor: RootAnchor;
  let publisher: HardhatEthersSigner;
  let stranger: HardhatEthersSigner;

  const BATCH_A = 'b-0001';
  const BATCH_B = 'b-0002';
  const BATCH_C = 'b-0003';
  const ROOT_A = fakeRoot(1);
  const ROOT_B = fakeRoot(2);
  const ROOT_C = fakeRoot(3);
  const LEAF_COUNT_A = 5;
  const LEAF_COUNT_B = 12;
  const LEAF_COUNT_C = 1;

  beforeEach(async () => {
    [publisher, stranger] = await ethers.getSigners() as [HardhatEthersSigner, HardhatEthersSigner];
    const Factory = await ethers.getContractFactory('RootAnchor');
    rootAnchor = (await Factory.deploy(publisher.address)) as RootAnchor;
    await rootAnchor.waitForDeployment();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Normal (happy path)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Normal: publish and retrieve', () => {
    it('deploys with publisher set correctly', async () => {
      expect(await rootAnchor.publisher()).to.equal(publisher.address);
    });

    it('count() is 0 before any publish', async () => {
      expect(await rootAnchor.count()).to.equal(0n);
    });

    it('publish returns id 0 for the first anchor', async () => {
      const tx = await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;
      // Return value from publish() — check via event
      const events = await rootAnchor.queryFilter(
        rootAnchor.filters.RootPublished(),
        receipt!.blockNumber,
      );
      expect(events.length).to.equal(1);
      expect(events[0]!.args.id).to.equal(0n);
    });

    it('publish returns id 1 and id 2 for subsequent anchors', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      await rootAnchor.publish(BATCH_B, ROOT_B, LEAF_COUNT_B);
      const tx = await rootAnchor.publish(BATCH_C, ROOT_C, LEAF_COUNT_C);
      const receipt = await tx.wait();
      const events = await rootAnchor.queryFilter(
        rootAnchor.filters.RootPublished(),
        receipt!.blockNumber,
      );
      expect(events[0]!.args.id).to.equal(2n);
    });

    it('count() increments after each publish', async () => {
      expect(await rootAnchor.count()).to.equal(0n);
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      expect(await rootAnchor.count()).to.equal(1n);
      await rootAnchor.publish(BATCH_B, ROOT_B, LEAF_COUNT_B);
      expect(await rootAnchor.count()).to.equal(2n);
    });

    it('get(0) returns the correct root, leafCount, and non-zero timestamp', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      const [batchKey, root, leafCount, timestamp] = await rootAnchor.get(0);

      expect(root).to.equal(ROOT_A);
      expect(leafCount).to.equal(LEAF_COUNT_A);
      expect(timestamp).to.be.gt(0n);
      // batchKey must equal keccak256(batchId)
      const expectedKey = ethers.keccak256(ethers.toUtf8Bytes(BATCH_A));
      expect(batchKey).to.equal(expectedKey);
    });

    it('get retrieves the correct data for id 1 and id 2', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      await rootAnchor.publish(BATCH_B, ROOT_B, LEAF_COUNT_B);
      await rootAnchor.publish(BATCH_C, ROOT_C, LEAF_COUNT_C);

      const [, rootB, countB] = await rootAnchor.get(1);
      expect(rootB).to.equal(ROOT_B);
      expect(countB).to.equal(LEAF_COUNT_B);

      const [, rootC, countC] = await rootAnchor.get(2);
      expect(rootC).to.equal(ROOT_C);
      expect(countC).to.equal(LEAF_COUNT_C);
    });

    it('find() returns (true, 0) for a published batchId', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      const [found, id] = await rootAnchor.find(BATCH_A);
      expect(found).to.be.true;
      expect(id).to.equal(0n);
    });

    it('find() returns (false, 0) for an unpublished batchId', async () => {
      const [found, id] = await rootAnchor.find('b-9999');
      expect(found).to.be.false;
      expect(id).to.equal(0n);
    });

    it('findByBatchKey() returns correct data', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      const key = ethers.keccak256(ethers.toUtf8Bytes(BATCH_A));
      const [id, root, leafCount, timestamp] = await rootAnchor.findByBatchKey(key);
      expect(id).to.equal(0n);
      expect(root).to.equal(ROOT_A);
      expect(leafCount).to.equal(LEAF_COUNT_A);
      expect(timestamp).to.be.gt(0n);
    });

    it('RootPublished event is emitted with correct fields', async () => {
      const tx = await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      const receipt = await tx.wait();
      const events = await rootAnchor.queryFilter(
        rootAnchor.filters.RootPublished(),
        receipt!.blockNumber,
      );
      expect(events.length).to.equal(1);
      const evt = events[0]!;
      expect(evt.args.batchId).to.equal(BATCH_A);
      expect(evt.args.root).to.equal(ROOT_A);
      expect(evt.args.leafCount).to.equal(LEAF_COUNT_A);
      expect(evt.args.timestamp).to.be.gt(0n);
    });

    it('publishByKey() works when batchKey matches keccak256(batchId)', async () => {
      const key = ethers.keccak256(ethers.toUtf8Bytes(BATCH_A));
      await rootAnchor.publishByKey(key, BATCH_A, ROOT_A, LEAF_COUNT_A);
      const [, root, leafCount] = await rootAnchor.get(0);
      expect(root).to.equal(ROOT_A);
      expect(leafCount).to.equal(LEAF_COUNT_A);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Adversarial (failure cases)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Adversarial: access control and validation', () => {
    it('non-publisher call reverts with NotPublisher', async () => {
      await expect(
        rootAnchor.connect(stranger).publish(BATCH_A, ROOT_A, LEAF_COUNT_A),
      ).to.be.revertedWithCustomError(rootAnchor, 'NotPublisher');
    });

    it('second publish of the same batchId reverts with BatchAlreadyAnchored', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      // Even with a different root, it must revert
      await expect(
        rootAnchor.publish(BATCH_A, ROOT_B, LEAF_COUNT_B),
      ).to.be.revertedWithCustomError(rootAnchor, 'BatchAlreadyAnchored');
    });

    it('BatchAlreadyAnchored carries the existing id', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A); // id 0
      await rootAnchor.publish(BATCH_B, ROOT_B, LEAF_COUNT_B); // id 1
      // Duplicate of BATCH_B should carry existingId = 1
      await expect(
        rootAnchor.publish(BATCH_B, ROOT_C, LEAF_COUNT_C),
      )
        .to.be.revertedWithCustomError(rootAnchor, 'BatchAlreadyAnchored')
        .withArgs(1n);
    });

    it('zero root reverts with ZeroRoot', async () => {
      await expect(
        rootAnchor.publish(BATCH_A, ethers.ZeroHash, LEAF_COUNT_A),
      ).to.be.revertedWithCustomError(rootAnchor, 'ZeroRoot');
    });

    it('zero leafCount reverts with ZeroLeafCount', async () => {
      await expect(
        rootAnchor.publish(BATCH_A, ROOT_A, 0),
      ).to.be.revertedWithCustomError(rootAnchor, 'ZeroLeafCount');
    });

    it('empty batchId reverts with EmptyBatchId', async () => {
      await expect(
        rootAnchor.publish('', ROOT_A, LEAF_COUNT_A),
      ).to.be.revertedWithCustomError(rootAnchor, 'EmptyBatchId');
    });

    it('get of an unknown id reverts with UnknownId', async () => {
      await expect(rootAnchor.get(0)).to.be.revertedWithCustomError(
        rootAnchor,
        'UnknownId',
      );
    });

    it('get of an out-of-range id (after some publishes) reverts with UnknownId', async () => {
      await rootAnchor.publish(BATCH_A, ROOT_A, LEAF_COUNT_A);
      await expect(rootAnchor.get(999)).to.be.revertedWithCustomError(
        rootAnchor,
        'UnknownId',
      );
    });

    it('findByBatchKey of an unknown key reverts with UnknownBatchKey', async () => {
      const unknownKey = ethers.keccak256(ethers.toUtf8Bytes('does-not-exist'));
      await expect(
        rootAnchor.findByBatchKey(unknownKey),
      ).to.be.revertedWithCustomError(rootAnchor, 'UnknownBatchKey');
    });

    it('publishByKey reverts when batchKey does not match keccak256(batchId)', async () => {
      const wrongKey = ethers.keccak256(ethers.toUtf8Bytes('wrong-id'));
      await expect(
        rootAnchor.publishByKey(wrongKey, BATCH_A, ROOT_A, LEAF_COUNT_A),
      ).to.be.revertedWith('RootAnchor: batchKey/batchId mismatch');
    });

    it('publisher address cannot be zero at deploy', async () => {
      const Factory = await ethers.getContractFactory('RootAnchor');
      await expect(
        Factory.deploy(ethers.ZeroAddress),
      ).to.be.revertedWith('RootAnchor: zero address');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ABI purity check: no delete/update/owner-change functions
  // ═══════════════════════════════════════════════════════════════════════════

  describe('ABI purity: no state-changing functions beyond publish/publishByKey', () => {
    it('the ABI has only publish and publishByKey as non-view state-changers', async () => {
      const iface = rootAnchor.interface;
      const statefulFns: string[] = [];

      for (const fragment of iface.fragments) {
        if (fragment.type !== 'function') continue;
        const fn = iface.getFunction(fragment.name);
        if (!fn) continue;
        // stateMutability is 'nonpayable' or 'payable' for state-changing functions
        if (fn.stateMutability !== 'view' && fn.stateMutability !== 'pure') {
          statefulFns.push(fragment.name);
        }
      }

      // Only publish and publishByKey should be state-changing
      expect(statefulFns.sort()).to.deep.equal(['publish', 'publishByKey'].sort());
    });

    it('there is no "delete" function in the ABI', () => {
      const names = rootAnchor.interface.fragments
        .filter((f) => f.type === 'function')
        .map((f) => f.name.toLowerCase());
      expect(names.some((n) => n.includes('delete'))).to.be.false;
      expect(names.some((n) => n.includes('remove'))).to.be.false;
      expect(names.some((n) => n.includes('clear'))).to.be.false;
    });

    it('there is no "update" or "set" function in the ABI', () => {
      const names = rootAnchor.interface.fragments
        .filter((f) => f.type === 'function')
        .map((f) => f.name.toLowerCase());
      expect(names.some((n) => n.includes('update'))).to.be.false;
      expect(names.some((n) => n.includes('setroot'))).to.be.false;
      expect(names.some((n) => n.includes('setpublisher'))).to.be.false;
      expect(names.some((n) => n.includes('transferownership'))).to.be.false;
    });
  });
});

import { AnchorEntry, verifyEntry, entryHash, GENESIS_PREV } from '@proofchain/core';
import { WitnessStore, WitnessEntry } from './store.js';

export interface WitnessIssue {
  kind: 'FORK' | 'ROLLBACK' | 'BAD_SIGNATURE' | 'ANCHOR_UNREACHABLE' | 'CHAIN_BREAK';
  seq?: number;
  details?: string;
  detectedAt: string;
}

export class WitnessPoller {
  private store: WitnessStore;
  private anchorUrl: string;
  private pinnedPublicKey: string;
  private pollIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private issues: WitnessIssue[] = [];
  private isPolling = false;

  constructor(options: {
    store: WitnessStore;
    anchorUrl?: string;
    pinnedPublicKey: string;
    pollIntervalMs?: number;
  }) {
    this.store = options.store;
    this.anchorUrl = options.anchorUrl || process.env.ANCHOR_URL || 'http://localhost:4100';
    this.pinnedPublicKey = options.pinnedPublicKey;
    this.pollIntervalMs = options.pollIntervalMs || 5000;
  }

  public setPinnedPublicKey(key: string): void {
    this.pinnedPublicKey = key;
  }

  public getPinnedPublicKey(): string {
    return this.pinnedPublicKey;
  }

  public getIssues(): WitnessIssue[] {
    return [...this.issues];
  }

  public isConsistent(): boolean {
    return this.issues.length === 0;
  }

  public async syncOnce(injectedEntries?: AnchorEntry[]): Promise<{
    added: number;
    issuesDetected: WitnessIssue[];
  }> {
    let entries: AnchorEntry[];

    if (injectedEntries) {
      entries = injectedEntries;
    } else {
      try {
        const response = await fetch(`${this.anchorUrl}/ledger`);
        if (!response.ok) {
          const issue: WitnessIssue = {
            kind: 'ANCHOR_UNREACHABLE',
            details: `HTTP ${response.status} from ${this.anchorUrl}/ledger`,
            detectedAt: new Date().toISOString(),
          };
          this.issues.push(issue);
          return { added: 0, issuesDetected: [issue] };
        }
        entries = (await response.json()) as AnchorEntry[];
      } catch (err: any) {
        const issue: WitnessIssue = {
          kind: 'ANCHOR_UNREACHABLE',
          details: `Fetch failed: ${err.message}`,
          detectedAt: new Date().toISOString(),
        };
        this.issues.push(issue);
        return { added: 0, issuesDetected: [issue] };
      }
    }

    const currentCount = this.store.getCount();
    const newIssues: WitnessIssue[] = [];

    // 1. Detect ROLLBACK: Anchor reports fewer entries than witnessed
    if (entries.length < currentCount) {
      const rollbackIssue: WitnessIssue = {
        kind: 'ROLLBACK',
        seq: currentCount - 1,
        details: `Anchor has ${entries.length} entries, but witness has recorded ${currentCount}`,
        detectedAt: new Date().toISOString(),
      };
      console.error(`🚨 [WITNESS CRITICAL] ROLLBACK DETECTED:`, rollbackIssue);
      this.issues.push(rollbackIssue);
      newIssues.push(rollbackIssue);
      return { added: 0, issuesDetected: newIssues };
    }

    let added = 0;
    let expectedPrev = currentCount === 0 ? GENESIS_PREV : this.store.get(currentCount - 1)?.entryHash || GENESIS_PREV;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Verify signature with pinned public key
      const isSigValid = verifyEntry(entry, this.pinnedPublicKey);
      if (!isSigValid) {
        const sigIssue: WitnessIssue = {
          kind: 'BAD_SIGNATURE',
          seq: entry.seq,
          details: `Invalid Ed25519 signature on entry seq ${entry.seq}`,
          detectedAt: new Date().toISOString(),
        };
        console.error(`🚨 [WITNESS ALERT] BAD SIGNATURE:`, sigIssue);
        this.issues.push(sigIssue);
        newIssues.push(sigIssue);
        // Do not process or append entries with bad signatures
        continue;
      }

      // Verify hash recomputation
      const computedHash = entryHash(entry);
      if (computedHash !== entry.entryHash) {
        const hashIssue: WitnessIssue = {
          kind: 'BAD_SIGNATURE',
          seq: entry.seq,
          details: `Recomputed entryHash ${computedHash} does not match ${entry.entryHash}`,
          detectedAt: new Date().toISOString(),
        };
        this.issues.push(hashIssue);
        newIssues.push(hashIssue);
        continue;
      }

      // Check against known entries in witness store
      const existing = this.store.get(entry.seq);
      if (existing) {
        // Detect FORK: Same seq, different entryHash!
        if (existing.entryHash !== entry.entryHash) {
          const forkIssue: WitnessIssue = {
            kind: 'FORK',
            seq: entry.seq,
            details: `FORK DETECTED at seq ${entry.seq}! Witness recorded ${existing.entryHash}, but anchor returned ${entry.entryHash}`,
            detectedAt: new Date().toISOString(),
          };
          console.error(`🚨 [WITNESS CRITICAL] FORK DETECTED:`, forkIssue);
          this.issues.push(forkIssue);
          newIssues.push(forkIssue);
        }
      } else {
        // New entry to witness and record
        // Verify prevHash chain continuity
        if (i > 0 && entry.prevHash !== entries[i - 1].entryHash) {
          const chainIssue: WitnessIssue = {
            kind: 'CHAIN_BREAK',
            seq: entry.seq,
            details: `prevHash mismatch at seq ${entry.seq}: expected ${entries[i - 1].entryHash}, got ${entry.prevHash}`,
            detectedAt: new Date().toISOString(),
          };
          this.issues.push(chainIssue);
          newIssues.push(chainIssue);
          continue;
        }

        this.store.append(entry.seq, entry.entryHash);
        added++;
      }
    }

    return { added, issuesDetected: newIssues };
  }

  public start(): void {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = async () => {
      try {
        await this.syncOnce();
      } catch (err) {
        console.error('[WitnessPoller] Poll error:', err);
      }
      if (this.isPolling) {
        this.timer = setTimeout(poll, this.pollIntervalMs);
      }
    };

    poll();
  }

  public stop(): void {
    this.isPolling = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

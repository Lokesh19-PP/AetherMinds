import fs from 'node:fs';
import path from 'node:path';

export interface WitnessEntry {
  seq: number;
  entryHash: string;
  observedAt: string;
}

export function getWitnessDataDir(): string {
  return process.env.WITNESS_DATA_DIR || path.resolve(process.cwd(), 'witness-data');
}

export class WitnessStore {
  private dataDir: string;
  private filePath: string;
  private entries: WitnessEntry[] = [];
  private seqMap = new Map<number, WitnessEntry>();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || getWitnessDataDir();
    this.filePath = path.join(this.dataDir, 'entries.jsonl');
  }

  public getFilePath(): string {
    return this.filePath;
  }

  public init(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.entries = [];
    this.seqMap.clear();

    if (!fs.existsSync(this.filePath)) {
      return;
    }

    const lines = fs
      .readFileSync(this.filePath, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0);

    for (const line of lines) {
      try {
        const item: WitnessEntry = JSON.parse(line);
        this.entries.push(item);
        this.seqMap.set(item.seq, item);
      } catch (err) {
        console.warn(`[WitnessStore] Skipping unparseable line: ${line}`);
      }
    }
  }

  public append(seq: number, entryHash: string, observedAt?: string): WitnessEntry {
    const entry: WitnessEntry = {
      seq,
      entryHash,
      observedAt: observedAt || new Date().toISOString(),
    };

    fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
    this.entries.push(entry);
    this.seqMap.set(seq, entry);

    return entry;
  }

  public get(seq: number): WitnessEntry | undefined {
    return this.seqMap.get(seq);
  }

  public getAll(): WitnessEntry[] {
    return [...this.entries];
  }

  public getHead(): WitnessEntry | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1];
  }

  public getCount(): number {
    return this.entries.length;
  }
}

let defaultStoreInstance: WitnessStore | null = null;

export function getWitnessStore(dataDir?: string): WitnessStore {
  if (!defaultStoreInstance || (dataDir && dataDir !== defaultStoreInstance.getFilePath())) {
    defaultStoreInstance = new WitnessStore(dataDir);
    defaultStoreInstance.init();
  }
  return defaultStoreInstance;
}

export function resetWitnessStore(): void {
  defaultStoreInstance = null;
}

// Pure logic for per-record cloud sync. No Firebase imports here, so it can be unit-tested.

export interface HasId {
  id: string;
}

export interface DiffResult<T extends HasId> {
  upserts: T[];
  deletes: string[];
  /** Ids present in the current list (after removing duplicates and bad ids). */
  currentIds: Set<string>;
  /** Hash (or JSON) of every current record, keyed by id. */
  nextSynced: Map<string, string>;
}

export interface DiffOptions {
  /** Turns a record's JSON into the value stored in `synced`. Default: the JSON itself. */
  hashFn?: (json: string) => string;
  /**
   * Only these ids may be reported as deleted. Used so that a record which this device never
   * had in its local list is not mistaken for a record the user deleted.
   */
  deletableIds?: Set<string>;
}

/** Small, fast, non-cryptographic 53-bit string hash (cyrb53), returned as base-36 text. */
export function hashString(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Compare current records with what was last synced; return only what changed. */
export function diffRecords<T extends HasId>(
  synced: Map<string, string>,
  current: T[],
  opts: DiffOptions = {}
): DiffResult<T> {
  const hashFn = opts.hashFn ?? ((j: string) => j);
  const upserts: T[] = [];
  const nextSynced = new Map<string, string>();
  const currentIds = new Set<string>();

  for (const rec of current) {
    if (!rec || typeof rec.id !== 'string' || rec.id === '') continue;
    if (currentIds.has(rec.id)) continue; // duplicate ids: keep the first
    currentIds.add(rec.id);
    const h = hashFn(JSON.stringify(rec));
    nextSynced.set(rec.id, h);
    if (synced.get(rec.id) !== h) upserts.push(rec);
  }

  const deletes: string[] = [];
  for (const id of synced.keys()) {
    if (currentIds.has(id)) continue;
    if (opts.deletableIds && !opts.deletableIds.has(id)) continue;
    deletes.push(id);
  }
  return { upserts, deletes, currentIds, nextSynced };
}

/**
 * Guard against accidental mass deletion (for example a device whose local state is
 * empty or stale). Returns true when the delete list looks dangerous.
 */
export function looksLikeMassDelete(
  deleteCount: number,
  syncedCount: number,
  minCount = 20,
  ratio = 0.3
): boolean {
  if (deleteCount < minCount) return false;
  return deleteCount / Math.max(syncedCount, 1) > ratio;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface BreakerOptions {
  maxPerMinute: number;
  maxPerDay: number;
  now?: () => number;
}

export interface BreakerState {
  tripped: boolean;
  reason: string;
  writesLastMinute: number;
  writesToday: number;
}

/**
 * Write circuit breaker. If the app tries to write more than the limits, it trips and
 * refuses all further writes until reset() is called. This protects the free quota
 * from a runaway save loop.
 */
export class WriteBreaker {
  private stamps: Array<{ t: number; n: number }> = [];
  private dayKey = '';
  private dayCount = 0;
  private trippedReason = '';
  private readonly opts: BreakerOptions;

  constructor(opts: BreakerOptions) {
    this.opts = opts;
  }

  private now(): number {
    return this.opts.now ? this.opts.now() : Date.now();
  }

  private today(): string {
    return new Date(this.now()).toISOString().slice(0, 10);
  }

  private prune(): void {
    const cutoff = this.now() - 60_000;
    this.stamps = this.stamps.filter((s) => s.t > cutoff);
    const d = this.today();
    if (d !== this.dayKey) {
      this.dayKey = d;
      this.dayCount = 0;
    }
  }

  private minuteTotal(): number {
    return this.stamps.reduce((a, s) => a + s.n, 0);
  }

  /** Ask permission to write n documents. Returns false (and trips) if over the limits. */
  allow(n: number): boolean {
    this.prune();
    if (this.trippedReason) return false;
    if (this.minuteTotal() + n > this.opts.maxPerMinute) {
      this.trippedReason = `Too many writes in one minute (limit ${this.opts.maxPerMinute}).`;
      return false;
    }
    if (this.dayCount + n > this.opts.maxPerDay) {
      this.trippedReason = `Daily write limit reached (limit ${this.opts.maxPerDay}).`;
      return false;
    }
    this.stamps.push({ t: this.now(), n });
    this.dayCount += n;
    return true;
  }

  /** Bulk operations (migration) count toward the day total but not the per-minute limit. */
  allowBulk(n: number): boolean {
    this.prune();
    if (this.trippedReason) return false;
    if (this.dayCount + n > this.opts.maxPerDay) {
      this.trippedReason = `Daily write limit reached (limit ${this.opts.maxPerDay}).`;
      return false;
    }
    this.dayCount += n;
    return true;
  }

  trip(reason: string): void {
    this.trippedReason = reason;
  }

  reset(): void {
    this.trippedReason = '';
    this.stamps = [];
  }

  state(): BreakerState {
    this.prune();
    return {
      tripped: this.trippedReason !== '',
      reason: this.trippedReason,
      writesLastMinute: this.minuteTotal(),
      writesToday: this.dayCount,
    };
  }
}

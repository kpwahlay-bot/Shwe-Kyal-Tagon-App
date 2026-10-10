// Cloud sync, version 4: one Firestore document per record (instead of one giant document).
//
// !! DO NOT REWRITE THIS FILE (people and AI assistants alike) !!
// It replaces an older design that stored the whole database in ONE document (sktg_sync/main_v3).
// That design lost data when two devices saved at the same time and cannot pass the security rules.
// Do not add: /api/sync, signInAnonymously, REST calls with an API key, or writes to sktg_sync/main_v3.
//
//  * Only records that changed are written, so a sale costs 1-2 writes, not "the whole database".
//  * Devices only download what changed since their last visit (cursor on `updatedAt`).
//  * Deleted records are kept as small "tombstones" so other devices learn about the deletion.
//  * A circuit breaker stops all writes if the app ever tries to write far too much.
//  * Nothing is read or written until the user is signed in with Firebase Auth.
//
// Firestore layout:   erp/{collection}/items/{recordId}
//   fields: id, json (the record as JSON text), deleted, updatedAt (server time), updatedBy
//
// The public functions keep the same names as before so App.tsx needs only small changes.

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Timestamp,
  writeBatch,
  getDocFromServer,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import {
  Branch,
  Employee,
  SalaryRecord,
  DailySale,
  DailyExpense,
  InventoryItem,
  StockMovement,
  ContactPartner,
  PurchaseRecord,
  TreasuryAccount,
  TreasuryTransaction,
  InterBranchTransfer,
  CompanyDepartment,
  SupplierReturn,
  SupplierBenefit,
  UserAccount,
} from '../types';
import {
  diffRecords,
  hashString,
  looksLikeMassDelete,
  chunk,
  WriteBreaker,
} from './syncEngine';

export interface CloudSyncPayload {
  branches: Branch[];
  users: UserAccount[];
  employees: Employee[];
  salaryRecords: SalaryRecord[];
  sales: DailySale[];
  expenses: DailyExpense[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  contacts: ContactPartner[];
  purchases?: PurchaseRecord[];
  supplierReturns?: SupplierReturn[];
  supplierBenefits?: SupplierBenefit[];
  treasuryAccounts?: TreasuryAccount[];
  treasuryTransactions?: TreasuryTransaction[];
  interBranchTransfers?: InterBranchTransfer[];
  customPositions?: Record<CompanyDepartment, string[]>;
  updatedAt: string;
  updatedBy: string;
}

// ---------------------------------------------------------------------------
// Which parts of the payload are synced, and where they live
// ---------------------------------------------------------------------------

// `users` is deliberately NOT synced: those accounts hold passwords/PINs. Staff profiles now
// live in the Firestore `users/{uid}` collection and are managed by the Add Staff form.
const RECORD_KEYS = [
  'branches',
  'employees',
  'salaryRecords',
  'sales',
  'expenses',
  'inventory',
  'stockMovements',
  'contacts',
  'purchases',
  'supplierReturns',
  'supplierBenefits',
  'treasuryAccounts',
  'treasuryTransactions',
  'interBranchTransfers',
] as const;
type RecordKey = (typeof RECORD_KEYS)[number];

// customPositions is one object, stored as a single record in its own collection.
const META_COLLECTION = 'meta';
const POSITIONS_ID = 'customPositions';
const ALL_COLLECTIONS: string[] = [...RECORD_KEYS, META_COLLECTION];

type AnyRecord = { id: string } & Record<string, unknown>;
type LocalPayload = Partial<Record<RecordKey, AnyRecord[]>> & {
  customPositions?: unknown;
  [k: string]: unknown;
};

const itemsCol = (name: string) => collection(db, 'erp', name, 'items');
// Firestore document ids cannot contain "/". The real id always stays inside the record itself.
const safeDocId = (id: string) => encodeURIComponent(id);
const itemRef = (name: string, id: string) => doc(db, 'erp', name, 'items', safeDocId(id));

// Collections this signed-in user is not allowed to read (for example payroll for a cashier).
// We stop syncing them on this device instead of failing every save.
const deniedCollections = new Set<string>(); // cannot read
const writeDeniedCollections = new Set<string>(); // can read, cannot write (e.g. staff and payroll edits)
// Versions of single records that the server refused (id -> hash). They are not retried until the
// record changes again, so one refused record can never block or repeat-spam the others.
const rejectedVersions = new Map<string, Map<string, string>>();
const DELETE_MARK = '#deleted';
function isRejected(name: string, id: string, hash: string): boolean {
  return rejectedVersions.get(name)?.get(id) === hash;
}
function rememberRejected(name: string, id: string, hash: string): void {
  let m = rejectedVersions.get(name);
  if (!m) rejectedVersions.set(name, (m = new Map()));
  m.set(id, hash);
}

// ---------------------------------------------------------------------------
// Quota helpers (kept for App.tsx)
// ---------------------------------------------------------------------------

let isQuotaExceededState = false;
let lastQuotaExceededTime = 0;
const QUOTA_COOLDOWN_MS = 15 * 60 * 1000;

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const str = typeof error === 'string' ? error : ((error as any)?.message || (error as any)?.code || String(error));
  return (
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded') ||
    str.includes('quota metric') ||
    str.includes('Free daily write units') ||
    str.includes('Free daily read units') ||
    str.includes('free tier database') ||
    str.includes('Quota exceeded')
  );
}

export function isOfflineOrUnavailableError(error: unknown): boolean {
  if (!error) return false;
  const str = typeof error === 'string' ? error : ((error as any)?.message || (error as any)?.code || String(error));
  return (
    str.includes('unavailable') ||
    str.includes('offline') ||
    str.includes('Could not reach Cloud Firestore backend') ||
    str.includes('Failed to get document because the client is offline') ||
    str.includes('network-request-failed')
  );
}

export function getIsQuotaExceeded(): boolean {
  if (isQuotaExceededState) {
    if (Date.now() - lastQuotaExceededTime < QUOTA_COOLDOWN_MS) return true;
    isQuotaExceededState = false;
    lastQuotaExceededTime = 0;
  }
  return false;
}

function markQuotaExceeded(): void {
  isQuotaExceededState = true;
  lastQuotaExceededTime = Date.now();
}

export function resetQuotaCooldown(): void {
  isQuotaExceededState = false;
  lastQuotaExceededTime = 0;
}

export function resetQuotaAndRetrySync(): void {
  resetQuotaCooldown();
}

export function getActiveSyncMode(): 'vercel_proxy' | 'direct_firestore' {
  return 'direct_firestore';
}

// ---------------------------------------------------------------------------
// Persistent per-device sync bookkeeping (hashes of what the cloud has, pull cursors)
// ---------------------------------------------------------------------------

const HASHES_KEY = 'sktg_sync_v4_hashes';
const CURSORS_KEY = 'sktg_sync_v4_cursors';

const hashes = new Map<string, Map<string, string>>(); // collection -> (id -> hash)
const cursors: Record<string, number> = {}; // collection -> last seen updatedAt (ms)
// The array object that was last compared successfully, per collection. Same array = nothing to compare.
const lastPlannedList = new Map<string, unknown>();
const lastPushIds = new Map<string, Set<string>>(); // every id this device has had on screen (only these may be deleted)

function hashesOf(name: string): Map<string, string> {
  let m = hashes.get(name);
  if (!m) {
    m = new Map();
    hashes.set(name, m);
  }
  return m;
}

function loadBookkeeping(): void {
  try {
    const rawH = localStorage.getItem(HASHES_KEY);
    if (rawH) {
      const obj = JSON.parse(rawH) as Record<string, Record<string, string>>;
      for (const name of Object.keys(obj)) hashes.set(name, new Map(Object.entries(obj[name])));
    }
    const rawC = localStorage.getItem(CURSORS_KEY);
    if (rawC) Object.assign(cursors, JSON.parse(rawC));
  } catch {
    // corrupted bookkeeping: start fresh (worst case: one full re-download)
    hashes.clear();
    for (const k of Object.keys(cursors)) delete cursors[k];
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persistBookkeeping(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      const obj: Record<string, Record<string, string>> = {};
      hashes.forEach((m, name) => {
        obj[name] = Object.fromEntries(m);
      });
      localStorage.setItem(HASHES_KEY, JSON.stringify(obj));
      localStorage.setItem(CURSORS_KEY, JSON.stringify(cursors));
    } catch {
      // storage full: not fatal
    }
  }, 2000);
}

if (typeof window !== 'undefined') loadBookkeeping();

// ---------------------------------------------------------------------------
// Status that the UI can show
// ---------------------------------------------------------------------------

export interface SyncInfo {
  signedIn: boolean;
  /** All collections have delivered their first snapshot. Writes are blocked until true. */
  ready: boolean;
  /** Cloud has no data yet: an MD must upload this device's data once. */
  needsMigration: boolean;
  breakerTripped: boolean;
  breakerReason: string;
  writesToday: number;
  /** The server refuses every collection for this account (rules not published, or no staff profile). */
  allDenied: boolean;
  /** Changes the server refused (permission), by collection. They stay on this device only. */
  refusedByCollection: Record<string, number>;
  /** The server has answered at least once in this session (not just the phone's own cache). */
  connected: boolean;
  /** No answer from the server for a while: internet, VPN or firewall problem. */
  connectionProblem: boolean;
}

// 300 writes/minute and 12,000/day are far above normal shop use, far below the 40,000 quota.
const breaker = new WriteBreaker({ maxPerMinute: 300, maxPerDay: 12000 });

const info: SyncInfo = {
  signedIn: false,
  ready: false,
  needsMigration: false,
  breakerTripped: false,
  breakerReason: '',
  writesToday: 0,
  allDenied: false,
  refusedByCollection: {},
  connected: false,
  connectionProblem: false,
};
const infoListeners = new Set<(i: SyncInfo) => void>();

function refreshInfo(): void {
  const b = breaker.state();
  info.breakerTripped = b.tripped;
  info.breakerReason = b.reason;
  info.writesToday = b.writesToday;
  info.allDenied = deniedCollections.size >= ALL_COLLECTIONS.length;
  const snapshot = { ...info, refusedByCollection: { ...info.refusedByCollection } };
  infoListeners.forEach((fn) => fn(snapshot));
}

export function getSyncInfo(): SyncInfo {
  refreshInfo();
  return { ...info, refusedByCollection: { ...info.refusedByCollection } };
}

export function onSyncInfoChange(fn: (i: SyncInfo) => void): () => void {
  infoListeners.add(fn);
  return () => {
    infoListeners.delete(fn);
  };
}

/** After fixing whatever caused the trip, allow writes again. */
export function resetWriteBreaker(): void {
  lastPlannedList.clear();
  breaker.reset();
  refreshInfo();
}

// The MD can approve ONE large save (for example restoring a backup) or ONE large deletion
// (for example "clear all stock"). It applies to the next push only.
let largeSaveApproved = false;

export function approveLargeSave(): void {
  largeSaveApproved = true;
  lastPlannedList.clear();
  breaker.reset();
  refreshInfo();
}

// ---------------------------------------------------------------------------
// Local state provider: App registers a function that returns its current arrays, so that
// downloaded changes can be merged into what is on screen instead of replacing it.
// ---------------------------------------------------------------------------

let localProvider: (() => LocalPayload) | null = null;

export function registerLocalStateProvider(fn: () => LocalPayload): void {
  localProvider = fn;
}

// ---------------------------------------------------------------------------
// Pulling changes from the cloud
// ---------------------------------------------------------------------------

interface RemoteChange {
  id: string;
  deleted: boolean;
  record?: any;
  hash: string;
}

const pendingRemote = new Map<string, Map<string, RemoteChange>>(); // collection -> id -> change
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let onDataCb: ((d: CloudSyncPayload) => void) | null = null;

function scheduleFlush(): void {
  if (flushTimer) return;
  // During start-up wait until every collection has answered once, so the screen is updated
  // one time instead of many times while thousands of records are still arriving.
  if (!info.ready) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushRemoteChanges();
  }, 300);
}

function flushRemoteChanges(): void {
  if (!onDataCb || pendingRemote.size === 0) return;
  const local: LocalPayload = localProvider ? localProvider() : {};
  const out: Record<string, unknown> = {};
  let touched = false;

  pendingRemote.forEach((changes, name) => {
    if (changes.size === 0) return;
    const synced = hashesOf(name);

    if (name === META_COLLECTION) {
      const ch = changes.get(POSITIONS_ID);
      if (ch && !ch.deleted && ch.record && ch.hash !== synced.get(POSITIONS_ID)) {
        out.customPositions = ch.record.value;
        synced.set(POSITIONS_ID, ch.hash);
        touched = true;
      }
      return;
    }

    const localList = ((local as any)[name] as AnyRecord[] | undefined) ?? [];
    const byId = new Map<string, AnyRecord>();
    localList.forEach((r) => {
      if (r && typeof r.id === 'string') byId.set(r.id, r);
    });
    let changed = false;

    changes.forEach((ch, id) => {
      const localRec = byId.get(id);
      const knownHash = synced.get(id);
      // The user edited this record on this device and has not pushed yet: keep their version.
      const hasUnsyncedLocalEdit =
        localRec !== undefined && knownHash !== undefined && hashString(JSON.stringify(localRec)) !== knownHash;
      if (hasUnsyncedLocalEdit) return;

      if (ch.deleted) {
        if (byId.delete(id)) changed = true;
        synced.delete(id);
      } else {
        byId.set(id, ch.record);
        synced.set(id, ch.hash);
        changed = true;
      }
    });

    if (changed) {
      out[name] = Array.from(byId.values());
      touched = true;
    }
  });

  pendingRemote.clear();
  persistBookkeeping();
  if (!touched) return;

  out.updatedAt = new Date().toISOString();
  out.updatedBy = 'Cloud Sync';
  onDataCb(out as unknown as CloudSyncPayload);
}

function maxMillis(snapDocs: Array<{ get: (f: string) => any }>): number {
  let max = 0;
  for (const d of snapDocs) {
    const ts = d.get('updatedAt');
    if (ts && typeof ts.toMillis === 'function') max = Math.max(max, ts.toMillis());
  }
  return max;
}

function adoptLocalAsSynced(): void {
  const local: LocalPayload = localProvider ? localProvider() : {};
  for (const name of RECORD_KEYS) {
    if (deniedCollections.has(name)) continue;
    const list = ((local as any)[name] as AnyRecord[] | undefined) ?? [];
    const known = hashesOf(name);
    for (const rec of list) {
      if (rec && typeof rec.id === 'string' && rec.id !== '' && !known.has(rec.id)) {
        known.set(rec.id, hashString(JSON.stringify(rec)));
      }
    }
  }
  persistBookkeeping();
}

export function subscribeToCloudData(
  onDataReceived: (data: CloudSyncPayload) => void,
  onError?: (err: Error) => void
): () => void {
  onDataCb = onDataReceived;
  let listeners: Unsubscribe[] = [];

  let connectionTimer: ReturnType<typeof setTimeout> | null = null;
  const stopListeners = () => {
    if (connectionTimer) clearTimeout(connectionTimer);
    connectionTimer = null;
    listeners.forEach((u) => u());
    listeners = [];
    info.ready = false;
    refreshInfo();
  };

  const startListeners = () => {
    stopListeners();
    const startedWithNoHistory = ALL_COLLECTIONS.every((n) => !cursors[n]);
    const firstSeen = new Set<string>();
    let anyDocs = false;
    deniedCollections.clear();
    writeDeniedCollections.clear();
    rejectedVersions.clear();
    lastPlannedList.clear();
    info.connected = false;
    info.connectionProblem = false;
    // If the server has not answered after a while, say so instead of silently waiting.
    connectionTimer = setTimeout(() => {
      if (!info.ready) {
        info.connectionProblem = true;
        refreshInfo();
      }
    }, 15000);

    const markSeen = (name: string, hadDocs: boolean) => {
      if (hadDocs) anyDocs = true;
      if (!firstSeen.has(name)) {
        firstSeen.add(name);
        if (firstSeen.size === ALL_COLLECTIONS.length) {
          // A device that never synced before, joining a cloud that already has data, must not
          // upload its own leftovers (demo data, old copies). Treat them as already known.
          if (startedWithNoHistory && anyDocs) adoptLocalAsSynced();
          info.ready = true;
          info.connectionProblem = false;
          // If the server refuses everything, the cloud is not "empty": it is blocked.
          info.needsMigration = startedWithNoHistory && !anyDocs && deniedCollections.size < ALL_COLLECTIONS.length;
          refreshInfo();
          scheduleFlush();
          // Changes made while offline (or before the first connection) are sent now.
          if (!info.needsMigration) {
            setTimeout(() => {
              if (localProvider && info.ready && !info.needsMigration) {
                void pushStateToCloud(localProvider() as any, 'Reconnect');
              }
            }, 1500);
          }
        }
      } else if (info.needsMigration && hadDocs) {
        info.needsMigration = false;
        refreshInfo();
      }
    };

    for (const name of ALL_COLLECTIONS) {
      const cursor = cursors[name];
      const q = cursor ? query(itemsCol(name), where('updatedAt', '>=', Timestamp.fromMillis(cursor))) : query(itemsCol(name));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const received = snap.docs.filter((d) => !d.metadata.hasPendingWrites);

          snap.docChanges().forEach((chg) => {
            if (chg.type === 'removed') return;
            const d = chg.doc;
            if (d.metadata.hasPendingWrites) return; // our own write, not yet confirmed
            const data = d.data() as { id?: string; json?: string; deleted?: boolean };
            const id = typeof data.id === 'string' && data.id !== '' ? data.id : d.id;
            const synced = hashesOf(name);

            if (data.deleted) {
              let m = pendingRemote.get(name);
              if (!m) pendingRemote.set(name, (m = new Map()));
              m.set(id, { id, deleted: true, hash: '' });
              return;
            }
            if (typeof data.json !== 'string') return;
            const h = hashString(data.json);
            if (synced.get(id) === h) return; // already know this version
            try {
              const record = JSON.parse(data.json);
              let m = pendingRemote.get(name);
              if (!m) pendingRemote.set(name, (m = new Map()));
              m.set(id, { id, deleted: false, record, hash: h });
            } catch (e) {
              console.warn('Skipped unreadable cloud record', name, id, e);
            }
          });

          const newest = maxMillis(received);
          if (newest > (cursors[name] || 0)) cursors[name] = newest;
          persistBookkeeping();

          // The first answer often comes from this phone's own cache (empty on a new device).
          // Only an answer from the server may decide whether the cloud is empty.
          if (snap.metadata && snap.metadata.fromCache === true) {
            scheduleFlush();
            return;
          }
          info.connected = true;
          markSeen(name, received.length > 0);
          scheduleFlush();
        },
        (err) => {
          if ((err as any)?.code === 'permission-denied') {
            deniedCollections.add(name);
            markSeen(name, false);
            refreshInfo();
            return;
          }
          if (isQuotaExceededError(err)) {
            markQuotaExceeded();
            console.warn('Firestore daily quota reached while reading.');
          } else if (isOfflineOrUnavailableError(err)) {
            console.info('Firestore offline; using local data.');
            info.connectionProblem = true;
            refreshInfo();
          } else {
            console.warn('Firestore listener notice:', name, err);
          }
          if (onError) onError(err);
        }
      );
      listeners.push(unsub);
    }
  };

  const stopAuth = onAuthStateChanged(auth, (user) => {
    info.signedIn = !!user;
    if (user) startListeners();
    else stopListeners();
    refreshInfo();
  });

  return () => {
    stopAuth();
    stopListeners();
    onDataCb = null;
  };
}

// The old code downloaded everything with fetchCloudData(). Now the subscription does the job;
// this stays so App.tsx keeps working and simply falls back to its local data at start-up.
export async function fetchCloudData(): Promise<CloudSyncPayload | null> {
  return null;
}

// ---------------------------------------------------------------------------
// Pushing changes to the cloud
// ---------------------------------------------------------------------------

export function serializePayloadForDiff(payload: Partial<CloudSyncPayload>): string {
  return JSON.stringify(Object.keys(payload).length);
}

export function updateLastKnownPayload(_payload: Partial<CloudSyncPayload>): void {
  // Not needed any more: knowledge of what the cloud has is kept per record in `hashes`.
}

interface PlannedWrite {
  name: string;
  id: string;
  json: string;
  hash: string;
  deleted: boolean;
}

function planWrites(
  payload: LocalPayload,
  force: boolean
): { writes: PlannedWrite[]; massDelete: boolean; lists: Map<string, unknown> } {
  const writes: PlannedWrite[] = [];
  const lists = new Map<string, unknown>();
  let massDelete = false;

  for (const name of RECORD_KEYS) {
    if (deniedCollections.has(name) || writeDeniedCollections.has(name)) continue;
    // Some screens push a partial payload (a collection missing). Missing means "not mine to touch",
    // never "empty": otherwise every record of that collection would be deleted.
    if (!Array.isArray((payload as any)[name])) continue;
    const list = (payload as any)[name] as AnyRecord[];
    // Same array object as the last successful comparison: nothing changed, skip the heavy work.
    if (!force && lastPlannedList.get(name) === list) continue;
    const synced = hashesOf(name);
    const seen = lastPushIds.get(name) ?? new Set<string>();
    const d = diffRecords(synced, list, { hashFn: hashString, deletableIds: seen });
    d.currentIds.forEach((id) => seen.add(id));
    lastPushIds.set(name, seen);

    if (!force && looksLikeMassDelete(d.deletes.length, synced.size)) {
      massDelete = true;
      continue;
    }
    lists.set(name, list);
    for (const rec of d.upserts) {
      const json = JSON.stringify(rec);
      const hash = hashString(json);
      if (!force && isRejected(name, rec.id, hash)) continue;
      writes.push({ name, id: rec.id, json, hash, deleted: false });
    }
    for (const id of d.deletes) {
      if (!force && isRejected(name, id, DELETE_MARK)) continue;
      writes.push({ name, id, json: '', hash: '', deleted: true });
    }
  }

  const positions = payload.customPositions;
  if (positions && typeof positions === 'object' && !deniedCollections.has(META_COLLECTION) && !writeDeniedCollections.has(META_COLLECTION)) {
    const json = JSON.stringify({ id: POSITIONS_ID, value: positions });
    const hash = hashString(json);
    if (hashesOf(META_COLLECTION).get(POSITIONS_ID) !== hash) {
      writes.push({ name: META_COLLECTION, id: POSITIONS_ID, json, hash, deleted: false });
    }
  }
  return { writes, massDelete, lists };
}

async function writeChunk(part: PlannedWrite[], updatedBy: string): Promise<void> {
  const batch = writeBatch(db);
  for (const w of part) {
    batch.set(itemRef(w.name, w.id), {
      id: w.id,
      json: w.json,
      deleted: w.deleted,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy.slice(0, 120),
    });
  }
  await batch.commit();
}

function markSynced(part: PlannedWrite[]): void {
  for (const w of part) {
    if (w.deleted) {
      hashesOf(w.name).delete(w.id);
      lastPushIds.get(w.name)?.delete(w.id);
    } else {
      hashesOf(w.name).set(w.id, w.hash);
    }
  }
  persistBookkeeping();
}

interface CommitResult {
  saved: number;
  refused: number;
}

async function commitWrites(writes: PlannedWrite[], updatedBy: string): Promise<CommitResult> {
  const result: CommitResult = { saved: 0, refused: 0 };
  const byCollection = new Map<string, PlannedWrite[]>();
  for (const w of writes) {
    const list = byCollection.get(w.name);
    if (list) list.push(w);
    else byCollection.set(w.name, [w]);
  }

  for (const [name, list] of byCollection) {
    let refusedHere = 0;
    for (const part of chunk(list, 400)) {
      try {
        await writeChunk(part, updatedBy);
        markSynced(part);
        result.saved += part.length;
        continue;
      } catch (err: any) {
        if (err?.code !== 'permission-denied') throw err;
      }
      // The server refused something in this batch. Retry one by one so that the allowed
      // records still get saved and only the refused ones are skipped. If the first few all
      // fail, the whole collection is refused: stop asking (thousands of failing requests are slow).
      let savedInPart = 0;
      let consecutiveRefused = 0;
      for (let i = 0; i < part.length; i++) {
        const w = part[i];
        if (savedInPart === 0 && consecutiveRefused >= 3) {
          for (let j = i; j < part.length; j++) {
            const r = part[j];
            rememberRejected(r.name, r.id, r.deleted ? DELETE_MARK : r.hash);
            refusedHere += 1;
          }
          break;
        }
        try {
          await writeChunk([w], updatedBy);
          markSynced([w]);
          savedInPart += 1;
          result.saved += 1;
          consecutiveRefused = 0;
        } catch (err: any) {
          if (err?.code !== 'permission-denied') throw err;
          rememberRejected(w.name, w.id, w.deleted ? DELETE_MARK : w.hash);
          refusedHere += 1;
          consecutiveRefused += 1;
        }
      }
    }
    if (refusedHere > 0) {
      result.refused += refusedHere;
      info.refusedByCollection[name] = (info.refusedByCollection[name] || 0) + refusedHere;
      console.warn(`The server refused ${refusedHere} change(s) in "${name}" for this account; kept on this device only.`);
      if (refusedHere > 50) writeDeniedCollections.add(name);
    }
  }
  return result;
}

export async function pushStateToCloud(
  payload: Omit<CloudSyncPayload, 'updatedAt' | 'updatedBy'>,
  updatedBy: string = 'User',
  force: boolean = false
): Promise<{ success: boolean; isQuotaExceeded?: boolean; skipped?: boolean; error?: string }> {
  try {
    // Not signed in, or the cloud state has not been downloaded yet: do nothing (no error).
    if (!auth.currentUser || !info.ready) {
      return { success: true, skipped: true };
    }
    if (info.needsMigration) {
      return { success: false, error: 'The cloud is still empty. The MD must upload the first data before changes are shared.' };
    }
    if (info.allDenied) {
      return { success: false, error: 'The cloud refused this account (permission denied). Check that the Firestore rules are published to the right database and that this account has a staff profile.' };
    }
    if (force) {
      resetQuotaCooldown();
    }
    if (!force && getIsQuotaExceeded()) {
      return { success: true, isQuotaExceeded: true, skipped: true, error: 'Firestore daily quota reached. Local data is safe.' };
    }

    const approved = largeSaveApproved;
    const { writes, massDelete, lists } = planWrites(payload as unknown as LocalPayload, approved);
    if (massDelete) {
      breaker.trip('Refused to delete a large share of records in one go. Nothing was deleted.');
      refreshInfo();
      return { success: false, error: breaker.state().reason };
    }
    if (writes.length === 0) {
      lists.forEach((l, n) => lastPlannedList.set(n, l));
      return { success: true, skipped: true };
    }

    const permitted = approved ? breaker.allowBulk(writes.length) : breaker.allow(writes.length);
    if (!permitted) {
      refreshInfo();
      return { success: false, error: `Sync paused to protect the quota. ${breaker.state().reason}` };
    }

    const res = await commitWrites(writes, updatedBy);
    largeSaveApproved = false;
    lists.forEach((l, n) => lastPlannedList.set(n, l));
    refreshInfo();
    if (res.saved === 0 && res.refused > 0) {
      return { success: false, error: `The cloud refused ${res.refused} change(s) (permission). They are kept on this device only.` };
    }
    resetQuotaCooldown();
    return { success: true };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
      return { success: false, isQuotaExceeded: true, error: 'Firestore daily quota reached. Local data is safe.' };
    }
    console.error('Failed to push state to Cloud:', err);
    return { success: false, error: err?.message || 'Cloud sync failed' };
  }
}

// ---------------------------------------------------------------------------
// One-time upload of this device's data into an empty cloud
// ---------------------------------------------------------------------------

export async function migrateLocalToCloud(
  payload: Omit<CloudSyncPayload, 'updatedAt' | 'updatedBy'>,
  updatedBy: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; total: number; error?: string }> {
  try {
    if (!auth.currentUser) return { success: false, total: 0, error: 'Please sign in first.' };
    if (!info.ready) return { success: false, total: 0, error: 'Still connecting to the cloud. Try again in a moment.' };
    if (info.allDenied) {
      return { success: false, total: 0, error: 'The cloud refused this account (permission denied). Publish the Firestore rules to the correct database first, then try again.' };
    }

    const { writes, lists } = planWrites(payload as unknown as LocalPayload, true);
    const total = writes.length;
    if (!breaker.allowBulk(total)) {
      refreshInfo();
      return { success: false, total, error: breaker.state().reason };
    }

    let done = 0;
    let refused = 0;
    for (const part of chunk(writes, 400)) {
      const res = await commitWrites(part, updatedBy);
      refused += res.refused;
      done += part.length;
      if (onProgress) onProgress(done, total);
    }
    if (refused > 0) {
      refreshInfo();
      return { success: false, total, error: `${refused} of ${total} records were refused by the cloud (permission). Nothing is lost on this device. Check the Firestore rules and your role.` };
    }
    lists.forEach((l, n) => lastPlannedList.set(n, l));
    info.needsMigration = false;
    refreshInfo();
    return { success: true, total };
  } catch (err: any) {
    if (isQuotaExceededError(err)) markQuotaExceeded();
    return { success: false, total: 0, error: err?.message || 'Upload failed' };
  }
}

// ---------------------------------------------------------------------------
// Old single-document copy (sktg_sync/main_v3) from before this update
//
// Before the update every device saved the whole database as one document. That document is
// never written any more. The MD can bring its content into the new per-record layout once.
// ---------------------------------------------------------------------------

export interface LegacyPeek {
  found: boolean;
  updatedAt?: string;
  updatedBy?: string;
  counts: Record<string, number>;
  error?: string;
}

function legacyList(raw: any, key: string): AnyRecord[] | null {
  const v = raw ? raw[key] : undefined;
  if (v === undefined || v === null) return null;
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((r: any) => r && typeof r.id === 'string' && r.id !== '') as AnyRecord[];
  } catch {
    return null;
  }
}

function legacyText(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  return String(v);
}

async function readLegacyDoc(): Promise<{ raw: any } | { error: string }> {
  if (!auth.currentUser) return { error: 'Please sign in first.' };
  try {
    const snap = await getDocFromServer(doc(db, 'sktg_sync', 'main_v3'));
    if (!snap.exists()) return { error: 'The old cloud copy was not found.' };
    return { raw: snap.data() };
  } catch (err: any) {
    if (isQuotaExceededError(err)) {
      markQuotaExceeded();
      return { error: 'The daily Firestore quota is used up. Try again after it resets.' };
    }
    if (err?.code === 'permission-denied') {
      return { error: 'Permission denied. Only the MD account can read the old copy, and the new rules must be published.' };
    }
    return { error: err?.message || 'Could not read the old cloud copy.' };
  }
}

/** Look at the old copy without changing anything (costs one read). */
export async function peekLegacyCloudData(): Promise<LegacyPeek> {
  const res = await readLegacyDoc();
  if ('error' in res) return { found: false, counts: {}, error: res.error };
  const counts: Record<string, number> = {};
  for (const name of RECORD_KEYS) {
    const list = legacyList(res.raw, name);
    if (list) counts[name] = list.length;
  }
  return {
    found: true,
    updatedAt: legacyText(res.raw.updatedAt),
    updatedBy: legacyText(res.raw.updatedBy),
    counts,
  };
}

/**
 * Make the cloud (and this screen) equal to the old copy: records in the old copy are written,
 * records that are in the cloud but not in the old copy are marked deleted. A collection that is
 * empty or missing in the old copy is left alone.
 */
export async function importLegacyCloudData(
  updatedBy: string,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: boolean; total: number; counts: Record<string, number>; error?: string }> {
  const none: Record<string, number> = {};
  try {
    if (!auth.currentUser) return { success: false, total: 0, counts: none, error: 'Please sign in first.' };
    if (!info.ready) return { success: false, total: 0, counts: none, error: 'Still connecting to the cloud. Try again in a moment.' };
    if (info.allDenied) return { success: false, total: 0, counts: none, error: 'The cloud refused this account (permission denied).' };

    const res = await readLegacyDoc();
    if ('error' in res) return { success: false, total: 0, counts: none, error: res.error };

    // Make sure everything the cloud already told us about is known before comparing.
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushRemoteChanges();

    const writes: PlannedWrite[] = [];
    const applied: Record<string, unknown> = {};
    const counts: Record<string, number> = {};

    for (const name of RECORD_KEYS) {
      const list = legacyList(res.raw, name);
      if (!list || list.length === 0 || deniedCollections.has(name)) continue;
      counts[name] = list.length;
      applied[name] = list;
      // No "deletable" limit here on purpose: everything in the cloud that is not in the old copy goes.
      const d = diffRecords(hashesOf(name), list, { hashFn: hashString });
      for (const rec of d.upserts) {
        const json = JSON.stringify(rec);
        writes.push({ name, id: rec.id, json, hash: hashString(json), deleted: false });
      }
      for (const id of d.deletes) writes.push({ name, id, json: '', hash: '', deleted: true });
      lastPushIds.set(name, new Set(d.currentIds));
    }

    let positions: unknown = undefined;
    try {
      const rawPos = res.raw.customPositions;
      positions = typeof rawPos === 'string' ? JSON.parse(rawPos) : rawPos;
    } catch {
      positions = undefined;
    }
    if (positions && typeof positions === 'object' && !deniedCollections.has(META_COLLECTION)) {
      const json = JSON.stringify({ id: POSITIONS_ID, value: positions });
      writes.push({ name: META_COLLECTION, id: POSITIONS_ID, json, hash: hashString(json), deleted: false });
      applied.customPositions = positions;
    }

    if (Object.keys(counts).length === 0) {
      return { success: false, total: 0, counts: none, error: 'The old copy has no records to bring over.' };
    }

    const total = writes.length;
    if (!breaker.allowBulk(total)) {
      refreshInfo();
      return { success: false, total, counts, error: breaker.state().reason };
    }

    let done = 0;
    let refused = 0;
    for (const part of chunk(writes, 400)) {
      const r = await commitWrites(part, updatedBy);
      refused += r.refused;
      done += part.length;
      if (onProgress) onProgress(done, total);
    }
    if (refused > 0) {
      refreshInfo();
      return { success: false, total, counts, error: `${refused} of ${total} records were refused by the cloud (permission).` };
    }

    // Show the same data on this screen.
    lastPlannedList.clear();
    info.needsMigration = false;
    refreshInfo();
    if (onDataCb) {
      onDataCb({ ...applied, updatedAt: new Date().toISOString(), updatedBy: 'Old cloud copy' } as unknown as CloudSyncPayload);
    }
    return { success: true, total, counts };
  } catch (err: any) {
    if (isQuotaExceededError(err)) markQuotaExceeded();
    return { success: false, total: 0, counts: none, error: err?.message || 'Import failed' };
  }
}

// ---------------------------------------------------------------------------
// Small compatibility functions. Older screens still call these names. Saving is now automatic:
// pushStateToCloud() compares the whole screen state with what the cloud has and writes only what
// changed, so these do nothing on purpose.
// ---------------------------------------------------------------------------
export function getLastPushedPayloadString(): string {
  return '';
}

export async function pullAllCloudData(): Promise<CloudSyncPayload | null> {
  // Live listeners already keep this device current; there is nothing to fetch by hand.
  return null;
}

export async function saveRecordToCloud(_collection: string, _record: unknown, _by?: string): Promise<void> {
  /* handled by pushStateToCloud */
}

export async function deleteDocumentFromCloud(_collection: string, _id: string, _by?: string): Promise<void> {
  /* handled by pushStateToCloud (a deleted record becomes a "tombstone") */
}

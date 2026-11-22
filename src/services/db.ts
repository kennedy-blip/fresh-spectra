import Dexie, { type Table } from 'dexie';
import type { PantryRecord, PantryRecordInput } from '../types';

export interface SyncQueueItem {
  id?: number;
  recordId: number;
  createdAt: number;
  kind: 'pantry-upsert';
  status: 'waiting-for-endpoint';
}

class FreshSpectraDB extends Dexie {
  pantry!: Table<PantryRecord, number>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('fresh-spectra-local-vault');
    this.version(1).stores({
      pantry: '++id, name, category, state, addedAt, expiresAt, syncStatus',
      syncQueue: '++id, recordId, createdAt, kind, status',
    });
  }
}

export const db = new FreshSpectraDB();

export async function addPantryRecord(input: PantryRecordInput): Promise<PantryRecord> {
  const record: PantryRecord = {
    ...input,
    addedAt: input.addedAt ?? Date.now(),
    syncStatus: 'queued',
  };
  await db.transaction('rw', db.pantry, db.syncQueue, async () => {
    const id = await db.pantry.add(record);
    record.id = id;
    await db.syncQueue.add({
      recordId: id,
      createdAt: Date.now(),
      kind: 'pantry-upsert',
      status: 'waiting-for-endpoint',
    });
  });
  return record;
}

export async function listPantryRecords(): Promise<PantryRecord[]> {
  return db.pantry.orderBy('addedAt').reverse().toArray();
}

export async function removePantryRecord(id: number): Promise<void> {
  await db.transaction('rw', db.pantry, db.syncQueue, async () => {
    await db.pantry.delete(id);
    await db.syncQueue.where('recordId').equals(id).delete();
  });
}

export async function getSyncQueueCount(): Promise<number> {
  return db.syncQueue.count();
}

export async function getStorageUsage(): Promise<{ usage: number; quota: number; persistent: boolean | null }> {
  let usage = 0;
  let quota = 0;
  let persistent: boolean | null = null;
  if ('storage' in navigator && navigator.storage) {
    const estimate = await navigator.storage.estimate();
    usage = estimate.usage ?? 0;
    quota = estimate.quota ?? 0;
    if ('persisted' in navigator.storage && typeof navigator.storage.persisted === 'function') {
      persistent = await navigator.storage.persisted();
    }
  }
  return { usage, quota, persistent };
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function pantryRecordsToCsv(records: PantryRecord[]): string {
  const rows = [
    ['name', 'category', 'state', 'added_at_iso', 'expires_at_iso', 'saved_estimate_usd', 'source', 'note'],
    ...records.map((record) => [
      record.name,
      record.category,
      record.state,
      new Date(record.addedAt).toISOString(),
      new Date(record.expiresAt).toISOString(),
      record.savedEstimate.toFixed(2),
      record.source,
      record.note ?? '',
    ]),
  ];
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

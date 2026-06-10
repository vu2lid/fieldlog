import { DEFAULT_SESSION, type Qso, type SessionContext } from '../core/model';
import { StorageError } from './types';

const DB_NAME = 'fieldlog';
const DB_VERSION = 1;
const QSO_STORE = 'qsos';
const META_STORE = 'meta';
const SESSION_KEY = 'session';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new StorageError('Failed to open database', request.error));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QSO_STORE)) {
        const store = db.createObjectStore(QSO_STORE, { keyPath: 'id' });
        store.createIndex('call', 'call', { unique: false });
        store.createIndex('qsoDate', 'qsoDate', { unique: false });
        store.createIndex('band', 'band', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new StorageError('Transaction failed', tx.error));
    tx.onabort = () => reject(new StorageError('Transaction aborted', tx.error));
  });
}

export async function getAllQsos(): Promise<Qso[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QSO_STORE, 'readonly');
    const request = tx.objectStore(QSO_STORE).getAll();
    request.onsuccess = () => resolve(request.result as Qso[]);
    request.onerror = () => reject(new StorageError('Failed to read QSOs', request.error));
  });
}

export async function putQso(qso: Qso): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QSO_STORE, 'readwrite');
  tx.objectStore(QSO_STORE).put(qso);
  await txComplete(tx);
}

export async function putQsos(qsos: Qso[]): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QSO_STORE, 'readwrite');
  const store = tx.objectStore(QSO_STORE);
  for (const qso of qsos) {
    store.put(qso);
  }
  await txComplete(tx);
}

export async function deleteQso(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(QSO_STORE, 'readwrite');
  tx.objectStore(QSO_STORE).delete(id);
  await txComplete(tx);
}

export async function getSession(): Promise<SessionContext> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const request = tx.objectStore(META_STORE).get(SESSION_KEY);
    request.onsuccess = () => {
      resolve((request.result as SessionContext | undefined) ?? { ...DEFAULT_SESSION });
    };
    request.onerror = () => reject(new StorageError('Failed to read session', request.error));
  });
}

export async function saveSession(session: SessionContext): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(META_STORE, 'readwrite');
  tx.objectStore(META_STORE).put(session, SESSION_KEY);
  await txComplete(tx);
}

export async function clearAllData(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([QSO_STORE, META_STORE], 'readwrite');
  tx.objectStore(QSO_STORE).clear();
  tx.objectStore(META_STORE).clear();
  await txComplete(tx);
}
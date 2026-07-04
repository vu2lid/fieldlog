import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Qso } from '../core/model';
import { clearAllData, closeDb, deleteQso, getAllQsos, getSession, putQso, saveSession } from './db';
import { StorageError } from './types';

function makeQso(id: string): Qso {
  const now = Date.now();
  return {
    id,
    call: 'W1AW',
    qsoDate: '20240601',
    timeOn: '120000',
    band: '20m',
    freq: 14.2,
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    createdAt: now,
    updatedAt: now,
  };
}

describe('storage/db', () => {
  afterEach(async () => {
    await clearAllData();
    await closeDb();
  });

  it('round-trips QSOs and session through IndexedDB', async () => {
    await putQso(makeQso('a'));
    await putQso(makeQso('b'));
    expect((await getAllQsos()).map((q) => q.id).sort()).toEqual(['a', 'b']);

    await deleteQso('a');
    expect((await getAllQsos()).map((q) => q.id)).toEqual(['b']);

    const session = { ...(await getSession()), stationCallsign: 'K0TEST' };
    await saveSession(session);
    expect((await getSession()).stationCallsign).toBe('K0TEST');
  });

  it('reuses a single connection across operations', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open');
    try {
      await putQso(makeQso('c'));
      await getAllQsos();
      await getSession();
      expect(openSpy).toHaveBeenCalledTimes(1);

      await closeDb();
      await getAllQsos();
      expect(openSpy).toHaveBeenCalledTimes(2);
    } finally {
      openSpy.mockRestore();
    }
  });

  it('flags quota errors distinctly on StorageError', () => {
    const quota = new StorageError('full', undefined, { quotaExceeded: true });
    expect(quota.quotaExceeded).toBe(true);
    expect(new StorageError('other').quotaExceeded).toBe(false);
  });
});

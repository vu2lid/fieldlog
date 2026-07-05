// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import type { Qso } from '../core/model';
import {
  DEFAULT_BACKUP_SETTINGS,
  createBackupSnapshot,
  getBackupStatus,
  loadBackupSettings,
  loadBackupSnapshot,
  logBackupFingerprint,
  saveBackupSettings,
  saveBackupSnapshot,
} from './backup';

function makeQso(overrides: Partial<Qso> = {}): Qso {
  return {
    id: 'qso-1',
    call: 'W1AW',
    qsoDate: '20240229',
    timeOn: '120000',
    band: '20m',
    freq: 14.2,
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('backup fingerprint', () => {
  it('is stable across log ordering and internal timestamp changes', () => {
    const first = makeQso();
    const second = makeQso({ id: 'qso-2', call: 'K1ABC' });
    expect(logBackupFingerprint([first, second])).toBe(
      logBackupFingerprint([
        { ...second, updatedAt: 9_999 },
        { ...first, createdAt: 5, updatedAt: 7 },
      ]),
    );
  });

  it('changes for ADIF-backed edits, additions, and deletions', () => {
    const first = makeQso();
    const second = makeQso({ id: 'qso-2', call: 'K1ABC' });
    const baseline = logBackupFingerprint([first]);
    expect(logBackupFingerprint([{ ...first, comment: 'changed' }])).not.toBe(baseline);
    expect(logBackupFingerprint([first, second])).not.toBe(baseline);
    expect(logBackupFingerprint([])).not.toBe(baseline);
  });
});

describe('backup reminder status', () => {
  it('stays current when exported ADIF content is unchanged', () => {
    const qsos = [makeQso()];
    const snapshot = createBackupSnapshot(qsos, 10_000);
    expect(getBackupStatus(qsos, snapshot, DEFAULT_BACKUP_SETTINGS, 100_000)).toMatchObject({
      dirty: false,
      recommended: false,
    });
  });

  it('recommends backup after the configured QSO count difference', () => {
    const qsos = Array.from({ length: 5 }, (_, index) =>
      makeQso({ id: `qso-${index}`, call: `K1A${index}` }),
    );
    const status = getBackupStatus(
      qsos,
      null,
      { qsoCountThreshold: 5, ageMinutesThreshold: 60 },
      1_000,
    );
    expect(status).toMatchObject({
      dirty: true,
      recommended: true,
      qsoCountDelta: 5,
      countThresholdReached: true,
    });
  });

  it('recommends backup after elapsed time when an edit keeps the same count', () => {
    const original = [makeQso()];
    const snapshot = createBackupSnapshot(original, 1_000);
    const edited = [{ ...original[0]!, comment: 'changed', updatedAt: 2_000 }];
    const status = getBackupStatus(
      edited,
      snapshot,
      { qsoCountThreshold: 10, ageMinutesThreshold: 30 },
      1_000 + 31 * 60_000,
    );
    expect(status).toMatchObject({
      dirty: true,
      recommended: true,
      qsoCountDelta: 0,
      ageThresholdReached: true,
    });
  });

  it('does not recommend exporting an empty log', () => {
    expect(getBackupStatus([], null, DEFAULT_BACKUP_SETTINGS, 100_000)).toMatchObject({
      dirty: false,
      recommended: false,
    });
  });
});

describe('backup preference persistence', () => {
  it('round-trips settings and snapshots', () => {
    const settings = { qsoCountThreshold: 25, ageMinutesThreshold: 60 };
    const snapshot = createBackupSnapshot([makeQso()], 123_456);
    saveBackupSettings(settings);
    saveBackupSnapshot(snapshot);
    expect(loadBackupSettings()).toEqual(settings);
    expect(loadBackupSnapshot()).toEqual(snapshot);
  });

  it('uses safe defaults for invalid stored data', () => {
    localStorage.setItem('fieldlog-backup-reminder', '{"qsoCountThreshold":0}');
    localStorage.setItem('fieldlog-backup-snapshot', '{"version":99}');
    expect(loadBackupSettings()).toEqual(DEFAULT_BACKUP_SETTINGS);
    expect(loadBackupSnapshot()).toBeNull();
  });
});

import { serializeRecord } from '../core/adif';
import { qsoToAdifRecord, type Qso } from '../core/model';

export interface BackupReminderSettings {
  qsoCountThreshold: number;
  ageMinutesThreshold: number;
}

export interface BackupSnapshot {
  version: 1;
  fingerprint: string;
  exportedAt: number;
  qsoCount: number;
}

export interface BackupStatus {
  fingerprint: string;
  dirty: boolean;
  recommended: boolean;
  qsoCountDelta: number;
  ageMinutes: number;
  countThresholdReached: boolean;
  ageThresholdReached: boolean;
  lastExportAt?: number;
}

export const DEFAULT_BACKUP_SETTINGS: BackupReminderSettings = {
  qsoCountThreshold: 10,
  ageMinutesThreshold: 30,
};

const SETTINGS_KEY = 'fieldlog-backup-reminder';
const SNAPSHOT_KEY = 'fieldlog-backup-snapshot';
const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

export function logBackupFingerprint(qsos: Qso[]): string {
  const records = qsos.map((qso) => serializeRecord(qsoToAdifRecord(qso))).sort();
  let hash = FNV_OFFSET;
  let totalLength = 0;
  for (const record of records) {
    totalLength += record.length;
    for (let index = 0; index < record.length; index++) {
      hash ^= BigInt(record.charCodeAt(index));
      hash = BigInt.asUintN(64, hash * FNV_PRIME);
    }
  }
  return `v1:${records.length}:${totalLength}:${hash.toString(16).padStart(16, '0')}`;
}

export function createBackupSnapshot(qsos: Qso[], exportedAt = Date.now()): BackupSnapshot {
  return {
    version: 1,
    fingerprint: logBackupFingerprint(qsos),
    exportedAt,
    qsoCount: qsos.length,
  };
}

export function getBackupStatus(
  qsos: Qso[],
  snapshot: BackupSnapshot | null,
  settings: BackupReminderSettings,
  now = Date.now(),
): BackupStatus {
  const fingerprint = logBackupFingerprint(qsos);
  if (qsos.length === 0) {
    return {
      fingerprint,
      dirty: false,
      recommended: false,
      qsoCountDelta: 0,
      ageMinutes: 0,
      countThresholdReached: false,
      ageThresholdReached: false,
      lastExportAt: snapshot?.exportedAt,
    };
  }

  const dirty = snapshot?.fingerprint !== fingerprint;
  const qsoCountDelta = snapshot ? Math.abs(qsos.length - snapshot.qsoCount) : qsos.length;
  const oldestChangeAt = Math.min(
    ...qsos.map((qso) => qso.updatedAt || qso.createdAt).filter((timestamp) => timestamp > 0),
  );
  const baseline = snapshot?.exportedAt ?? (Number.isFinite(oldestChangeAt) ? oldestChangeAt : now);
  const ageMinutes = Math.max(0, Math.floor((now - baseline) / 60_000));
  const countThresholdReached = qsoCountDelta >= settings.qsoCountThreshold;
  const ageThresholdReached = ageMinutes >= settings.ageMinutesThreshold;

  return {
    fingerprint,
    dirty,
    recommended: dirty && (countThresholdReached || ageThresholdReached),
    qsoCountDelta,
    ageMinutes,
    countThresholdReached,
    ageThresholdReached,
    lastExportAt: snapshot?.exportedAt,
  };
}

export function loadBackupSettings(): BackupReminderSettings {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) ?? 'null',
    ) as Partial<BackupReminderSettings> | null;
    if (
      stored &&
      Number.isInteger(stored.qsoCountThreshold) &&
      stored.qsoCountThreshold! > 0 &&
      Number.isInteger(stored.ageMinutesThreshold) &&
      stored.ageMinutesThreshold! > 0
    ) {
      return {
        qsoCountThreshold: stored.qsoCountThreshold!,
        ageMinutesThreshold: stored.ageMinutesThreshold!,
      };
    }
  } catch {
    // Invalid or unavailable preference storage falls back to safe defaults.
  }
  return DEFAULT_BACKUP_SETTINGS;
}

export function saveBackupSettings(settings: BackupReminderSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The setting still applies for this visit when localStorage is unavailable.
  }
}

export function loadBackupSnapshot(): BackupSnapshot | null {
  try {
    const stored = JSON.parse(
      localStorage.getItem(SNAPSHOT_KEY) ?? 'null',
    ) as Partial<BackupSnapshot> | null;
    if (
      stored?.version === 1 &&
      typeof stored.fingerprint === 'string' &&
      typeof stored.exportedAt === 'number' &&
      Number.isFinite(stored.exportedAt) &&
      typeof stored.qsoCount === 'number' &&
      Number.isInteger(stored.qsoCount) &&
      stored.qsoCount >= 0
    ) {
      return stored as BackupSnapshot;
    }
  } catch {
    // Invalid or unavailable preference storage means no recorded full export.
  }
  return null;
}

export function saveBackupSnapshot(snapshot: BackupSnapshot): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Backup status remains available for this visit when localStorage is unavailable.
  }
}

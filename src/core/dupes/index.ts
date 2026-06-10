import type { Qso } from '../model';

export type DupeMode = 'band-mode' | 'any';

export interface DupeResult {
  isDupe: boolean;
  matches: Qso[];
}

export function isDupe(
  qsos: Qso[],
  candidate: Pick<Qso, 'call' | 'band' | 'mode'>,
  mode: DupeMode = 'band-mode',
  excludeId?: string,
): DupeResult {
  const call = candidate.call.toUpperCase();
  const matches = qsos.filter((q) => {
    if (excludeId && q.id === excludeId) return false;
    if (q.call.toUpperCase() !== call) return false;
    if (mode === 'any') return true;
    return q.band === candidate.band && q.mode === candidate.mode;
  });
  return { isDupe: matches.length > 0, matches };
}

export function qsoIdentityKey(qso: Qso): string {
  return [
    qso.call.toUpperCase(),
    qso.qsoDate,
    qso.timeOn,
    qso.band,
    qso.mode,
    String(qso.freq),
  ].join('|');
}

export function mergeQsos(existing: Qso[], incoming: Qso[]): {
  added: Qso[];
  skipped: Qso[];
} {
  const keys = new Set(existing.map(qsoIdentityKey));
  const added: Qso[] = [];
  const skipped: Qso[] = [];
  for (const qso of incoming) {
    const key = qsoIdentityKey(qso);
    if (keys.has(key)) {
      skipped.push(qso);
    } else {
      keys.add(key);
      added.push(qso);
    }
  }
  return { added, skipped };
}
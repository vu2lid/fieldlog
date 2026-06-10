import { describe, expect, it } from 'vitest';
import type { Qso } from '../model';
import { isDupe, mergeQsos } from './index';

function makeQso(overrides: Partial<Qso>): Qso {
  return {
    id: '1',
    call: 'K1ABC',
    qsoDate: '20240601',
    timeOn: '120000',
    band: '20m',
    freq: 14.2,
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe('duplicate detection', () => {
  const log = [
    makeQso({ id: '1', call: 'K1ABC', band: '20m', mode: 'SSB' }),
    makeQso({ id: '2', call: 'W1AW', band: '40m', mode: 'CW' }),
  ];

  it('detects dupes on same band and mode', () => {
    expect(isDupe(log, { call: 'K1ABC', band: '20m', mode: 'SSB' }).isDupe).toBe(true);
    expect(isDupe(log, { call: 'K1ABC', band: '40m', mode: 'SSB' }).isDupe).toBe(false);
  });

  it('detects dupes on any band', () => {
    expect(isDupe(log, { call: 'K1ABC', band: '10m', mode: 'CW' }, 'any').isDupe).toBe(true);
  });
});

describe('mergeQsos', () => {
  it('deduplicates on import', () => {
    const existing = [makeQso({ id: '1' })];
    const incoming = [makeQso({ id: '2' }), makeQso({ id: '3', call: 'W1AW' })];
    const { added, skipped } = mergeQsos(existing, incoming);
    expect(added).toHaveLength(1);
    expect(skipped).toHaveLength(1);
  });
});
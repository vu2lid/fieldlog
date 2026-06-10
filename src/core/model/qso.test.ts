import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAdi, serializeAdi } from '../adif';
import { adifRecordToQso, qsoToAdifRecord } from './qso';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures');

describe('QSO model', () => {
  it('converts ADIF record to QSO with POTA fields', () => {
    const result = parseAdi(readFileSync(join(fixturesDir, 'pota-p2p.adi'), 'utf-8'));
    const qso = adifRecordToQso(result.records[0]!);
    expect(qso.call).toBe('K1ABC');
    expect(qso.mySig).toBe('POTA');
    expect(qso.sigInfo).toBe('US-CA-0123');
    expect(qso.potaRef).toBe('US-CA-0123');
  });

  it('round-trips QSO through ADIF', () => {
    const qso = adifRecordToQso(
      parseAdi(readFileSync(join(fixturesDir, 'minimal.adi'), 'utf-8')).records[0]!,
    );
    const adi = serializeAdi([qsoToAdifRecord(qso)]);
    const reparsed = adifRecordToQso(parseAdi(adi).records[0]!);
    expect(reparsed.call).toBe(qso.call);
    expect(reparsed.band).toBe(qso.band);
    expect(reparsed.freq).toBe(qso.freq);
  });
});

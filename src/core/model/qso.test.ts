import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAdi, serializeAdi } from '../adif';
import { adifRecordToQso, createQsoId, qsoToAdifRecord } from './qso';

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

  it('defaults missing RST by mode on import', () => {
    const cw = adifRecordToQso(
      parseAdi('<CALL:4>W1AW<BAND:3>40m<MODE:2>CW<EOR>').records[0]!,
    );
    expect(cw.rstSent).toBe('599');
    expect(cw.rstRcvd).toBe('599');

    const ssb = adifRecordToQso(
      parseAdi('<CALL:4>W1AW<BAND:3>20m<MODE:3>SSB<EOR>').records[0]!,
    );
    expect(ssb.rstSent).toBe('59');
    expect(ssb.rstRcvd).toBe('59');
  });
});

describe('createQsoId', () => {
  const V4_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('generates a v4 UUID', () => {
    expect(createQsoId()).toMatch(V4_SHAPE);
  });

  it('falls back to getRandomValues when randomUUID is unavailable (insecure context)', () => {
    const original = crypto.randomUUID;
    // Simulate insecure context where crypto.randomUUID does not exist
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      const ids = new Set([createQsoId(), createQsoId(), createQsoId()]);
      expect(ids.size).toBe(3);
      for (const id of ids) {
        expect(id).toMatch(V4_SHAPE);
      }
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAdi } from './parser';
import { serializeAdi } from './serializer';

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '../../../fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('parseAdi', () => {
  it('parses minimal QSO with header', () => {
    const result = parseAdi(loadFixture('minimal.adi'));
    expect(result.errors).toHaveLength(0);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.fields.get('CALL')).toBe('VK2ABC');
    expect(result.header.fields.get('ADIF_VER')).toBe('3.1.7');
  });

  it('parses POTA park-to-park fields', () => {
    const result = parseAdi(loadFixture('pota-p2p.adi'));
    const fields = result.records[0]!.fields;
    expect(fields.get('MY_SIG')).toBe('POTA');
    expect(fields.get('SIG_INFO')).toBe('US-CA-0123');
    expect(fields.get('COMMENT')).toBe('Park to park QSO');
  });

  it('normalizes mixed-case field names', () => {
    const result = parseAdi(loadFixture('mixed-case.adi'));
    expect(result.records[0]!.fields.get('CALL')).toBe('W1AW');
    expect(result.records[0]!.fields.get('MODE')).toBe('CW');
  });

  it('handles data containing angle brackets', () => {
    const result = parseAdi(loadFixture('special-chars.adi'));
    expect(result.records[0]!.fields.get('CALL')).toBe('TEST<>1');
    expect(result.records[0]!.fields.get('COMMENT')).toBe('Test <tag>');
  });

  it('parses files without header', () => {
    const result = parseAdi(loadFixture('no-header.adi'));
    expect(result.header.fields.size).toBe(0);
    expect(result.records[0]!.fields.get('CALL')).toBe('G3XYZ');
  });

  it('round-trips parse → serialize → parse', () => {
    const fixtures = ['minimal.adi', 'pota-p2p.adi', 'mixed-case.adi', 'special-chars.adi', 'no-header.adi'];
    for (const fixture of fixtures) {
      const first = parseAdi(loadFixture(fixture));
      const serialized = serializeAdi(first.records);
      const second = parseAdi(serialized);
      expect(second.errors).toHaveLength(0);
      expect(second.records.length).toBe(first.records.length);
      for (let i = 0; i < first.records.length; i++) {
        const a = first.records[i]!.fields;
        const b = second.records[i]!.fields;
        for (const [key, value] of a) {
          expect(b.get(key)).toBe(value);
        }
      }
    }
  });

  it('handles large files', () => {
    const records = Array.from({ length: 2000 }, (_, i) => ({
      fields: new Map([
        ['CALL', `K${String(i).padStart(4, '0')}`],
        ['QSO_DATE', '20240601'],
        ['TIME_ON', String(100000 + i).slice(0, 6)],
        ['BAND', '20m'],
        ['FREQ', '14.2'],
        ['MODE', 'SSB'],
        ['RST_SENT', '59'],
        ['RST_RCVD', '59'],
      ]),
    }));
    const adi = serializeAdi(records);
    const result = parseAdi(adi);
    expect(result.errors).toHaveLength(0);
    expect(result.records).toHaveLength(2000);
  });
});
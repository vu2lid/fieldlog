import { describe, expect, it } from 'vitest';
import { parseAdi } from './parser';

describe('parseAdi error handling', () => {
  it('reports malformed fields without crashing', () => {
    const result = parseAdi('<CALL>NO_LENGTH\n<EOR>\n');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles preamble before header tags', () => {
    const adi = `ADIF Export\n<ADIF_VER:5>3.1.7\n<EOH>\n<CALL:4>W1AW\n<QSO_DATE:8>20240101\n<TIME_ON:6>120000\n<BAND:3>20m\n<FREQ:4>14.2\n<MODE:3>SSB\n<RST_SENT:2>59\n<RST_RCVD:2>59\n<EOR>\n`;
    const result = parseAdi(adi);
    expect(result.header.preamble).toContain('ADIF Export');
    expect(result.records[0]?.fields.get('CALL')).toBe('W1AW');
  });

  it('reports truncated field data', () => {
    const result = parseAdi('<CALL:20>SHORT<EOR>');
    expect(result.errors.some((e) => e.message.includes('truncated'))).toBe(true);
  });

  it('preserves unknown fields', () => {
    const adi =
      '<CALL:4>W1AW\n<CUSTOM_FIELD:5>HELLO\n<QSO_DATE:8>20240101\n<TIME_ON:6>120000\n<BAND:3>20m\n<FREQ:4>14.2\n<MODE:3>SSB\n<RST_SENT:2>59\n<RST_RCVD:2>59\n<EOR>\n';
    const result = parseAdi(adi);
    expect(result.records[0]?.fields.get('CUSTOM_FIELD')).toBe('HELLO');
  });
});

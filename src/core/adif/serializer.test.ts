import { describe, expect, it } from 'vitest';
import { buildHeader, serializeAdi } from './serializer';
import { ADIF_VERSION, PROGRAM_ID, PROGRAM_VERSION } from './types';

describe('serializeAdi', () => {
  it('emits required ADIF 3.1.7 header', () => {
    const header = buildHeader(new Date('2026-06-09T12:00:00Z'));
    expect(header).toContain(`<ADIF_VER:5>${ADIF_VERSION}`);
    expect(header).toContain(`<PROGRAMID:${PROGRAM_ID.length}>${PROGRAM_ID}`);
    expect(header).toContain(`<PROGRAMVERSION:${PROGRAM_VERSION.length}>${PROGRAM_VERSION}`);
    expect(header).toContain('<CREATED_TIMESTAMP:15>');
    expect(header).toContain('<EOH>');
  });

  it('serializes records with EOR terminator', () => {
    const adi = serializeAdi([
      {
        fields: new Map([
          ['CALL', 'K1ABC'],
          ['QSO_DATE', '20240601'],
          ['TIME_ON', '120000'],
          ['BAND', '20m'],
          ['FREQ', '14.2'],
          ['MODE', 'SSB'],
          ['RST_SENT', '59'],
          ['RST_RCVD', '59'],
        ]),
      },
    ]);
    expect(adi).toContain('<EOR>');
    expect(adi).toContain('<CALL:5>K1ABC');
  });

  it('serializes extra fields in sorted order', () => {
    const adi = serializeAdi([
      {
        fields: new Map([
          ['CALL', 'K1ABC'],
          ['ZZZ_FIELD', 'extra'],
          ['QSO_DATE', '20240601'],
          ['TIME_ON', '120000'],
          ['BAND', '20m'],
          ['FREQ', '14.2'],
          ['MODE', 'SSB'],
          ['RST_SENT', '59'],
          ['RST_RCVD', '59'],
        ]),
      },
    ]);
    expect(adi).toContain('<ZZZ_FIELD:5>extra');
  });
});
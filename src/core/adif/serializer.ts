import { byteLength } from './bytes';
import type { AdifRecord } from './types';
import { ADIF_VERSION, PROGRAM_ID, PROGRAM_VERSION } from './types';

function formatField(name: string, value: string): string {
  const len = byteLength(value);
  return `<${name}:${len}>${value}`;
}

function formatTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d} ${hh}${mm}${ss}`;
}

export function buildHeader(createdAt: Date = new Date()): string {
  const lines = [
    formatField('ADIF_VER', ADIF_VERSION),
    formatField('PROGRAMID', PROGRAM_ID),
    formatField('PROGRAMVERSION', PROGRAM_VERSION),
    formatField('CREATED_TIMESTAMP', formatTimestamp(createdAt)),
    '<EOH>',
  ];
  return lines.join('\n') + '\n';
}

export function serializeRecord(record: AdifRecord): string {
  const preferredOrder = [
    'CALL',
    'QSO_DATE',
    'TIME_ON',
    'TIME_OFF',
    'BAND',
    'FREQ',
    'MODE',
    'SUBMODE',
    'RST_SENT',
    'RST_RCVD',
    'NAME',
    'QTH',
    'GRIDSQUARE',
    'COMMENT',
    'TX_PWR',
    'STATION_CALLSIGN',
    'OPERATOR',
    'MY_GRIDSQUARE',
    'MY_SIG',
    'MY_SIG_INFO',
    'SIG',
    'SIG_INFO',
    'POTA_REF',
    'MY_POTA_REF',
    'SOTA_REF',
    'MY_SOTA_REF',
    'CONTEST_ID',
    'STX',
    'SRX',
    'STX_STRING',
    'SRX_STRING',
  ];

  const emitted = new Set<string>();
  const parts: string[] = [];

  for (const name of preferredOrder) {
    const value = record.fields.get(name);
    if (value !== undefined && value !== '') {
      parts.push(formatField(name, value));
      emitted.add(name);
    }
  }

  const remaining = [...record.fields.keys()].filter((k) => !emitted.has(k)).sort();
  for (const name of remaining) {
    const value = record.fields.get(name);
    if (value !== undefined && value !== '') {
      parts.push(formatField(name, value));
    }
  }

  parts.push('<EOR>');
  return parts.join('\n') + '\n';
}

export function serializeAdi(records: AdifRecord[], createdAt: Date = new Date()): string {
  return buildHeader(createdAt) + records.map(serializeRecord).join('');
}

import { describe, expect, it } from 'vitest';
import type { Qso } from '../core/model';
import { EMPTY_LOG_FILTER, filterQsos } from './logFilter';

function makeQso(overrides: Partial<Qso>): Qso {
  return {
    id: Math.random().toString(36).slice(2),
    call: 'W1AW',
    qsoDate: '20240601',
    timeOn: '120000',
    band: '20m',
    freq: 14.2,
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const log = [
  makeQso({ call: 'W1AW', band: '20m', mode: 'SSB', qsoDate: '20240601' }),
  makeQso({ call: 'G3XYZ', band: '40m', mode: 'CW', qsoDate: '20240610' }),
  makeQso({ call: 'VK2ABC', band: '20m', mode: 'CW', qsoDate: '20240620' }),
];

describe('filterQsos', () => {
  it('returns everything for the empty filter', () => {
    expect(filterQsos(log, EMPTY_LOG_FILTER)).toHaveLength(3);
  });

  it('matches callsign case-insensitively', () => {
    const out = filterQsos(log, { ...EMPTY_LOG_FILTER, search: 'g3' });
    expect(out.map((q) => q.call)).toEqual(['G3XYZ']);
  });

  it('filters by band and mode', () => {
    const out = filterQsos(log, { ...EMPTY_LOG_FILTER, band: '20m', mode: 'CW' });
    expect(out.map((q) => q.call)).toEqual(['VK2ABC']);
  });

  it('filters by date range from native date-input values', () => {
    const out = filterQsos(log, {
      ...EMPTY_LOG_FILTER,
      dateFrom: '2024-06-05',
      dateTo: '2024-06-15',
    });
    expect(out.map((q) => q.call)).toEqual(['G3XYZ']);
  });

  it('supports open-ended date ranges', () => {
    const from = filterQsos(log, { ...EMPTY_LOG_FILTER, dateFrom: '2024-06-10' });
    expect(from.map((q) => q.call)).toEqual(['G3XYZ', 'VK2ABC']);
    const to = filterQsos(log, { ...EMPTY_LOG_FILTER, dateTo: '2024-06-09' });
    expect(to.map((q) => q.call)).toEqual(['W1AW']);
  });
});

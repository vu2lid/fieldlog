import { describe, expect, it } from 'vitest';
import type { Qso } from './qso';
import { validateCallsign, validateQso } from './validation';

function validQso(overrides: Partial<Qso> = {}): Partial<Qso> {
  return {
    call: 'K1ABC',
    qsoDate: '20240229',
    timeOn: '235959',
    band: '20m',
    freq: 14.2,
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    ...overrides,
  };
}

describe('validateCallsign', () => {
  it('accepts ordinary and portable callsigns', () => {
    expect(validateCallsign('K1ABC')).toBeNull();
    expect(validateCallsign('vk2abc/p')).toBeNull();
  });

  it('treats a missing callsign as an error', () => {
    expect(validateCallsign('   ')).toMatchObject({
      field: 'call',
      code: 'required',
      severity: 'error',
    });
  });

  it('treats unusual callsigns as reviewable warnings', () => {
    expect(validateCallsign('K1')).toMatchObject({
      code: 'short-callsign',
      severity: 'warning',
    });
    expect(validateCallsign('K1-ABC')).toMatchObject({
      code: 'invalid-callsign-characters',
      severity: 'warning',
    });
  });
});

describe('validateQso', () => {
  it('accepts a complete valid QSO', () => {
    expect(validateQso(validQso())).toEqual({
      valid: true,
      errors: [],
      warnings: [],
      issues: [],
    });
  });

  it('returns structured errors for every required field', () => {
    const result = validateQso({});
    expect(result.valid).toBe(false);
    expect(result.errors.map((candidate) => candidate.field)).toEqual([
      'call',
      'qsoDate',
      'timeOn',
      'band',
      'freq',
      'mode',
      'rstSent',
      'rstRcvd',
    ]);
    expect(result.warnings).toEqual([]);
  });

  it.each([
    ['20230229', false],
    ['20240229', true],
    ['20241301', false],
    ['20240431', false],
    ['2024011', false],
    ['00000101', false],
  ])('validates ADIF date %s', (qsoDate, expectedValid) => {
    const result = validateQso(validQso({ qsoDate }));
    expect(result.errors.some((candidate) => candidate.code === 'invalid-date')).toBe(
      !expectedValid,
    );
  });

  it.each([
    ['0000', true],
    ['2359', true],
    ['235959', true],
    ['240000', false],
    ['126099', false],
    ['12345', false],
  ])('validates ADIF time %s', (timeOn, expectedValid) => {
    const result = validateQso(validQso({ timeOn }));
    expect(result.errors.some((candidate) => candidate.code === 'invalid-time')).toBe(
      !expectedValid,
    );
  });

  it('validates an optional time off when present', () => {
    expect(validateQso(validQso({ timeOff: undefined })).valid).toBe(true);
    expect(validateQso(validQso({ timeOff: '1200' })).valid).toBe(true);
    expect(validateQso(validQso({ timeOff: '250000' })).errors).toContainEqual(
      expect.objectContaining({ field: 'timeOff', code: 'invalid-time' }),
    );
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects invalid frequency %s', (freq) => {
    const result = validateQso(validQso({ freq }));
    expect(result.errors).toContainEqual(
      expect.objectContaining({ field: 'freq', code: 'invalid-frequency' }),
    );
  });

  it('warns about band-plan inconsistencies without rejecting the QSO', () => {
    const mismatch = validateQso(validQso({ band: '40m', freq: 14.2 }));
    expect(mismatch.valid).toBe(true);
    expect(mismatch.warnings).toContainEqual(
      expect.objectContaining({ code: 'band-frequency-mismatch' }),
    );

    const outside = validateQso(validQso({ band: '20m', freq: 3000 }));
    expect(outside.valid).toBe(true);
    expect(outside.warnings).toContainEqual(
      expect.objectContaining({ code: 'frequency-outside-band' }),
    );
  });

  it('allows unknown bands and modes with warnings for imported data', () => {
    const result = validateQso(validQso({ band: '13cm', freq: 2300, mode: 'MFSK' }));
    expect(result.valid).toBe(true);
    expect(result.warnings.map((candidate) => candidate.code)).toEqual([
      'unknown-band',
      'unknown-mode',
    ]);
  });

  it.each(['FN31', 'FN31PR', 'FN31PR12'])('accepts Maidenhead grid %s', (gridSquare) => {
    expect(validateQso(validQso({ gridSquare })).warnings).toEqual([]);
  });

  it('warns about unusual local and remote grid squares', () => {
    const result = validateQso(validQso({ gridSquare: 'NOT-A-GRID', myGridSquare: 'ZZ99' }));
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([
      expect.objectContaining({ field: 'gridSquare', code: 'invalid-grid' }),
      expect.objectContaining({ field: 'myGridSquare', code: 'invalid-grid' }),
    ]);
  });

  it('keeps warnings and errors available in original validation order', () => {
    const result = validateQso(validQso({ call: 'K1', qsoDate: '20230229' }));
    expect(result.valid).toBe(false);
    expect(result.issues.map((candidate) => candidate.code)).toEqual([
      'short-callsign',
      'invalid-date',
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});

import { describe, expect, it } from 'vitest';
import { validateCallsign, validateQso } from './validation';

describe('validation', () => {
  it('warns on unusual callsigns without blocking', () => {
    expect(validateCallsign('K1ABC')).toBeNull();
    expect(validateCallsign('K1')?.message).toContain('short');
    expect(validateCallsign('K1-ABC')?.message).toContain('unusual');
  });

  it('validates required QSO fields', () => {
    const warnings = validateQso({ call: 'K1ABC' });
    expect(warnings.some((w) => w.field === 'qsoDate')).toBe(true);
  });
});
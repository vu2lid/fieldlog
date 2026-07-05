import { BAND_PLAN, MODES, frequencyToBand, normalizeBandName } from '../bands';
import type { Qso } from './qso';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationCode =
  | 'required'
  | 'invalid-callsign-characters'
  | 'short-callsign'
  | 'invalid-date'
  | 'invalid-time'
  | 'invalid-frequency'
  | 'unknown-band'
  | 'frequency-outside-band'
  | 'band-frequency-mismatch'
  | 'unknown-mode'
  | 'invalid-grid';

export interface ValidationIssue {
  field: keyof Qso;
  code: ValidationCode;
  severity: ValidationSeverity;
  message: string;
}

/** @deprecated Use ValidationIssue. Retained while UI callers migrate. */
export type ValidationWarning = ValidationIssue;

export interface QsoValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  issues: ValidationIssue[];
}

const CALLSIGN_PATTERN = /^[A-Z0-9/]+$/;
const DATE_PATTERN = /^\d{8}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3])[0-5]\d(?:[0-5]\d)?$/;
const GRID_PATTERN = /^[A-R]{2}\d{2}(?:[A-X]{2}(?:\d{2})?)?$/i;

function issue(
  field: keyof Qso,
  code: ValidationCode,
  severity: ValidationSeverity,
  message: string,
): ValidationIssue {
  return { field, code, severity, message };
}

function required(field: keyof Qso, label: string): ValidationIssue {
  return issue(field, 'required', 'error', `${label} is required`);
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isValidAdifDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (year === 0 || month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1]!;
}

function validateDate(
  field: 'qsoDate',
  value: string | undefined,
  label: string,
): ValidationIssue | null {
  if (isBlank(value)) return required(field, label);
  if (!isValidAdifDate(value!)) {
    return issue(field, 'invalid-date', 'error', `${label} must be a real date in YYYYMMDD format`);
  }
  return null;
}

function validateTime(
  field: 'timeOn' | 'timeOff',
  value: string | undefined,
  label: string,
  requiredValue: boolean,
): ValidationIssue | null {
  if (isBlank(value)) return requiredValue ? required(field, label) : null;
  if (!TIME_PATTERN.test(value!)) {
    return issue(field, 'invalid-time', 'error', `${label} must be HHMM or HHMMSS in UTC`);
  }
  return null;
}

export function validateCallsign(call: string): ValidationIssue | null {
  const upper = call.trim().toUpperCase();
  if (!upper) {
    return required('call', 'Callsign');
  }
  if (!CALLSIGN_PATTERN.test(upper)) {
    return issue(
      'call',
      'invalid-callsign-characters',
      'warning',
      'Callsign contains unusual characters',
    );
  }
  if (upper.length < 3) {
    return issue('call', 'short-callsign', 'warning', 'Callsign seems short');
  }
  return null;
}

/**
 * Validates the FieldLog QSO model without mutating or normalizing it.
 *
 * Errors identify records that cannot safely enter the canonical log.
 * Warnings identify unusual values that may still be legitimate amateur-radio
 * or imported ADIF data and therefore require user review rather than rejection.
 */
export function validateQso(qso: Partial<Qso>): QsoValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (candidate: ValidationIssue | null) => {
    if (candidate) issues.push(candidate);
  };

  add(validateCallsign(qso.call ?? ''));
  add(validateDate('qsoDate', qso.qsoDate, 'QSO date'));
  add(validateTime('timeOn', qso.timeOn, 'Time on', true));
  add(validateTime('timeOff', qso.timeOff, 'Time off', false));

  if (isBlank(qso.band)) {
    issues.push(required('band', 'Band'));
  } else {
    const normalizedBand = normalizeBandName(qso.band!);
    const knownBand = BAND_PLAN.some((definition) => definition.name === normalizedBand);
    if (!knownBand) {
      issues.push(
        issue('band', 'unknown-band', 'warning', 'Band is not in the FieldLog band plan'),
      );
    } else if (typeof qso.freq === 'number' && Number.isFinite(qso.freq) && qso.freq > 0) {
      const frequencyBand = frequencyToBand(qso.freq);
      if (frequencyBand === null) {
        issues.push(
          issue(
            'freq',
            'frequency-outside-band',
            'warning',
            `Frequency ${qso.freq} MHz is outside the supported ${normalizedBand} range`,
          ),
        );
      } else if (frequencyBand !== normalizedBand) {
        issues.push(
          issue(
            'freq',
            'band-frequency-mismatch',
            'warning',
            `Frequency ${qso.freq} MHz belongs to ${frequencyBand}, not ${normalizedBand}`,
          ),
        );
      }
    }
  }

  if (typeof qso.freq !== 'number' || !Number.isFinite(qso.freq) || qso.freq <= 0) {
    issues.push(
      issue('freq', 'invalid-frequency', 'error', 'Frequency must be a positive number in MHz'),
    );
  }

  if (isBlank(qso.mode)) {
    issues.push(required('mode', 'Mode'));
  } else if (!MODES.some((definition) => definition.mode === qso.mode!.trim().toUpperCase())) {
    issues.push(issue('mode', 'unknown-mode', 'warning', 'Mode is not in the FieldLog mode list'));
  }

  if (isBlank(qso.rstSent)) issues.push(required('rstSent', 'RST sent'));
  if (isBlank(qso.rstRcvd)) issues.push(required('rstRcvd', 'RST received'));

  if (!isBlank(qso.gridSquare) && !GRID_PATTERN.test(qso.gridSquare!.trim())) {
    issues.push(
      issue(
        'gridSquare',
        'invalid-grid',
        'warning',
        'Grid square is not a recognized 4, 6, or 8 character Maidenhead locator',
      ),
    );
  }
  if (!isBlank(qso.myGridSquare) && !GRID_PATTERN.test(qso.myGridSquare!.trim())) {
    issues.push(
      issue(
        'myGridSquare',
        'invalid-grid',
        'warning',
        'My grid square is not a recognized 4, 6, or 8 character Maidenhead locator',
      ),
    );
  }

  const errors = issues.filter((candidate) => candidate.severity === 'error');
  const warnings = issues.filter((candidate) => candidate.severity === 'warning');
  return { valid: errors.length === 0, errors, warnings, issues };
}

export function getUtcNow(): { qsoDate: string; timeOn: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return { qsoDate: `${y}${m}${d}`, timeOn: `${hh}${mm}${ss}` };
}

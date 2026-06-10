import type { Qso } from './qso';

export interface ValidationWarning {
  field: string;
  message: string;
}

const CALLSIGN_PATTERN = /^[A-Z0-9/]+$/;

export function validateCallsign(call: string): ValidationWarning | null {
  const upper = call.trim().toUpperCase();
  if (!upper) {
    return { field: 'call', message: 'Callsign is required' };
  }
  if (!CALLSIGN_PATTERN.test(upper)) {
    return { field: 'call', message: 'Callsign contains unusual characters' };
  }
  if (upper.length < 3) {
    return { field: 'call', message: 'Callsign seems short' };
  }
  return null;
}

export function validateQso(qso: Partial<Qso>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  if (qso.call) {
    const callWarn = validateCallsign(qso.call);
    if (callWarn) warnings.push(callWarn);
  } else {
    warnings.push({ field: 'call', message: 'Callsign is required' });
  }
  if (!qso.qsoDate) warnings.push({ field: 'qsoDate', message: 'QSO date is required' });
  if (!qso.timeOn) warnings.push({ field: 'timeOn', message: 'Time on is required' });
  if (!qso.band) warnings.push({ field: 'band', message: 'Band is required' });
  if (!qso.mode) warnings.push({ field: 'mode', message: 'Mode is required' });
  return warnings;
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
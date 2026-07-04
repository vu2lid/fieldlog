export interface SessionContext {
  stationCallsign: string;
  operatorCallsign: string;
  myGridSquare: string;
  myPotaRef: string;
  mySotaRef: string;
  band: string;
  mode: string;
  freq: number;
  dupeMode: 'band-mode' | 'any';
  /** QSOs logged at or after this timestamp count toward the session. 0 = all. */
  sessionStartedAt: number;
}

export const DEFAULT_SESSION: SessionContext = {
  stationCallsign: '',
  operatorCallsign: '',
  myGridSquare: '',
  myPotaRef: '',
  mySotaRef: '',
  band: '20m',
  mode: 'SSB',
  freq: 14.2,
  dupeMode: 'band-mode',
  sessionStartedAt: 0,
};

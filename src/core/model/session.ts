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
};
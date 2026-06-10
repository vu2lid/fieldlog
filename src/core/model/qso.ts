import type { AdifRecord } from '../adif';
import { bandToDefaultFrequency, frequencyToBand, normalizeBandName } from '../bands';

export interface Qso {
  id: string;
  call: string;
  qsoDate: string;
  timeOn: string;
  timeOff?: string;
  band: string;
  freq: number;
  mode: string;
  submode?: string;
  rstSent: string;
  rstRcvd: string;
  name?: string;
  qth?: string;
  gridSquare?: string;
  comment?: string;
  txPwr?: string;
  stationCallsign?: string;
  operator?: string;
  myGridSquare?: string;
  mySig?: string;
  mySigInfo?: string;
  sig?: string;
  sigInfo?: string;
  potaRef?: string;
  myPotaRef?: string;
  sotaRef?: string;
  mySotaRef?: string;
  contestId?: string;
  stx?: string;
  srx?: string;
  stxString?: string;
  srxString?: string;
  extraFields?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export function createQsoId(): string {
  return crypto.randomUUID();
}

export function qsoToAdifRecord(qso: Qso): AdifRecord {
  const fields = new Map<string, string>();
  const set = (name: string, value: string | number | undefined) => {
    if (value !== undefined && value !== '') {
      fields.set(name, String(value));
    }
  };

  set('CALL', qso.call);
  set('QSO_DATE', qso.qsoDate);
  set('TIME_ON', qso.timeOn);
  set('TIME_OFF', qso.timeOff);
  set('BAND', qso.band);
  set('FREQ', qso.freq);
  set('MODE', qso.mode);
  set('SUBMODE', qso.submode);
  set('RST_SENT', qso.rstSent);
  set('RST_RCVD', qso.rstRcvd);
  set('NAME', qso.name);
  set('QTH', qso.qth);
  set('GRIDSQUARE', qso.gridSquare);
  set('COMMENT', qso.comment);
  set('TX_PWR', qso.txPwr);
  set('STATION_CALLSIGN', qso.stationCallsign);
  set('OPERATOR', qso.operator);
  set('MY_GRIDSQUARE', qso.myGridSquare);
  set('MY_SIG', qso.mySig);
  set('MY_SIG_INFO', qso.mySigInfo);
  set('SIG', qso.sig);
  set('SIG_INFO', qso.sigInfo);
  set('POTA_REF', qso.potaRef);
  set('MY_POTA_REF', qso.myPotaRef);
  set('SOTA_REF', qso.sotaRef);
  set('MY_SOTA_REF', qso.mySotaRef);
  set('CONTEST_ID', qso.contestId);
  set('STX', qso.stx);
  set('SRX', qso.srx);
  set('STX_STRING', qso.stxString);
  set('SRX_STRING', qso.srxString);

  if (qso.extraFields) {
    for (const [key, value] of Object.entries(qso.extraFields)) {
      if (value) fields.set(key.toUpperCase(), value);
    }
  }

  return { fields };
}

function getField(record: AdifRecord, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = record.fields.get(name);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function adifRecordToQso(record: AdifRecord, id = createQsoId()): Qso {
  const now = Date.now();
  const call = getField(record, 'CALL') ?? '';
  const bandRaw = getField(record, 'BAND') ?? '';
  const freqRaw = getField(record, 'FREQ');
  let freq = freqRaw ? parseFloat(freqRaw) : NaN;
  let band = bandRaw ? normalizeBandName(bandRaw) : '';

  if (!band && !Number.isNaN(freq)) {
    band = frequencyToBand(freq) ?? '';
  }
  if ((!freq || Number.isNaN(freq)) && band) {
    const defaultFreq = bandToDefaultFrequency(band);
    if (defaultFreq !== null) freq = defaultFreq;
  }
  if (Number.isNaN(freq)) freq = 0;

  const potaRef = getField(record, 'POTA_REF');
  const sig = getField(record, 'SIG');
  const sigInfo = getField(record, 'SIG_INFO');
  const myPotaRef = getField(record, 'MY_POTA_REF');
  const mySig = getField(record, 'MY_SIG');
  const mySigInfo = getField(record, 'MY_SIG_INFO');

  const known = new Set([
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
  ]);

  const extraFields: Record<string, string> = {};
  for (const [key, value] of record.fields) {
    if (!known.has(key) && value) extraFields[key] = value;
  }

  return {
    id,
    call: call.toUpperCase(),
    qsoDate: getField(record, 'QSO_DATE') ?? '',
    timeOn: getField(record, 'TIME_ON') ?? '',
    timeOff: getField(record, 'TIME_OFF'),
    band,
    freq,
    mode: (getField(record, 'MODE') ?? 'SSB').toUpperCase(),
    submode: getField(record, 'SUBMODE'),
    rstSent: getField(record, 'RST_SENT') ?? '59',
    rstRcvd: getField(record, 'RST_RCVD') ?? '59',
    name: getField(record, 'NAME'),
    qth: getField(record, 'QTH'),
    gridSquare: getField(record, 'GRIDSQUARE'),
    comment: getField(record, 'COMMENT'),
    txPwr: getField(record, 'TX_PWR'),
    stationCallsign: getField(record, 'STATION_CALLSIGN'),
    operator: getField(record, 'OPERATOR'),
    myGridSquare: getField(record, 'MY_GRIDSQUARE'),
    mySig: mySig ?? (myPotaRef ? 'POTA' : undefined),
    mySigInfo: mySigInfo ?? myPotaRef,
    sig: sig ?? (potaRef ? 'POTA' : undefined),
    sigInfo: sigInfo ?? potaRef,
    potaRef: potaRef ?? (sig === 'POTA' ? sigInfo : undefined),
    myPotaRef: myPotaRef ?? (mySig === 'POTA' ? mySigInfo : undefined),
    sotaRef: getField(record, 'SOTA_REF'),
    mySotaRef: getField(record, 'MY_SOTA_REF'),
    contestId: getField(record, 'CONTEST_ID'),
    stx: getField(record, 'STX'),
    srx: getField(record, 'SRX'),
    stxString: getField(record, 'STX_STRING'),
    srxString: getField(record, 'SRX_STRING'),
    extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeTimeOn(time: string): string {
  const digits = time.replace(/\D/g, '');
  if (digits.length >= 6) return digits.slice(0, 6);
  if (digits.length === 4) return digits + '00';
  return digits;
}

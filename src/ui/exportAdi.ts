import { serializeAdi } from '../core/adif';
import { qsoToAdifRecord, type Qso } from '../core/model';

export function downloadQsosAsAdi(qsos: Qso[], filename: string): void {
  const records = qsos.map(qsoToAdifRecord);
  const adi = serializeAdi(records);
  const blob = new Blob([adi], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

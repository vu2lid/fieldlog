import type { Qso } from '../core/model';

export interface LogFilter {
  search: string;
  band: string;
  mode: string;
  /** YYYY-MM-DD, as produced by <input type="date"> */
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_LOG_FILTER: LogFilter = {
  search: '',
  band: '',
  mode: '',
  dateFrom: '',
  dateTo: '',
};

export function filterQsos(qsos: Qso[], filter: LogFilter): Qso[] {
  const q = filter.search.trim().toUpperCase();
  const from = filter.dateFrom.replaceAll('-', '');
  const to = filter.dateTo.replaceAll('-', '');
  return qsos.filter((row) => {
    if (q && !row.call.toUpperCase().includes(q)) return false;
    if (filter.band && row.band !== filter.band) return false;
    if (filter.mode && row.mode !== filter.mode) return false;
    if (from && row.qsoDate < from) return false;
    if (to && row.qsoDate > to) return false;
    return true;
  });
}

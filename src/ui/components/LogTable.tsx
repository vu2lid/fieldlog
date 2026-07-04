import { useMemo, useState } from 'react';
import type { Qso } from '../../core/model';
import type { LogFilter } from '../logFilter';

type SortKey = keyof Qso | 'none';
type SortDir = 'asc' | 'desc';

interface LogTableProps {
  qsos: Qso[];
  filteredQsos: Qso[];
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  onEdit: (qso: Qso) => void;
  onDelete: (id: string) => void;
}

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 25;

export function LogTable({
  qsos,
  filteredQsos,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
}: LogTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('qsoDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [scrollTop, setScrollTop] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const bands = useMemo(() => [...new Set(qsos.map((q) => q.band))].sort(), [qsos]);
  const modes = useMemo(() => [...new Set(qsos.map((q) => q.mode))].sort(), [qsos]);

  const filtered = useMemo(() => {
    if (sortKey === 'none') return filteredQsos;
    return [...filteredQsos].sort((a, b) => {
      const av = a[sortKey as keyof Qso];
      const bv = b[sortKey as keyof Qso];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredQsos, sortKey, sortDir]);

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT));
  const endIndex = Math.min(filtered.length, startIndex + VISIBLE_ROWS);
  const visible = filtered.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (filtered.length - endIndex) * ROW_HEIGHT);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <section className="panel" aria-labelledby="log-heading">
      <h2 id="log-heading">Log ({filtered.length} QSOs)</h2>
      <div className="log-toolbar">
        <input
          type="search"
          placeholder="Search callsign"
          value={filter.search}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          aria-label="Search by callsign"
        />
        <select
          value={filter.band}
          onChange={(e) => onFilterChange({ ...filter, band: e.target.value })}
          aria-label="Filter by band"
        >
          <option value="">All bands</option>
          {bands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={filter.mode}
          onChange={(e) => onFilterChange({ ...filter, mode: e.target.value })}
          aria-label="Filter by mode"
        >
          <option value="">All modes</option>
          {modes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filter.dateFrom}
          onChange={(e) => onFilterChange({ ...filter, dateFrom: e.target.value })}
          aria-label="Filter from date"
        />
        <input
          type="date"
          value={filter.dateTo}
          onChange={(e) => onFilterChange({ ...filter, dateTo: e.target.value })}
          aria-label="Filter to date"
        />
      </div>
      <div
        className="log-table-wrap"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        role="region"
        aria-label="QSO log table"
      >
        <table className="log-table">
          <thead>
            <tr>
              {(
                [
                  ['call', 'Call'],
                  ['qsoDate', 'Date'],
                  ['timeOn', 'Time'],
                  ['band', 'Band'],
                  ['freq', 'Freq'],
                  ['mode', 'Mode'],
                ] as const
              ).map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  <button type="button" className="th-sort" onClick={() => toggleSort(key)}>
                    {label}
                    {sortKey === key && (
                      <span aria-hidden="true"> {sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </button>
                </th>
              ))}
              <th scope="col">RST</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No QSOs yet. Log your first contact on the Log tab.
                </td>
              </tr>
            ) : (
              <>
                {topPad > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={8} style={{ height: topPad, padding: 0, border: 'none' }} />
                  </tr>
                )}
                {visible.map((qso) => (
                  <tr key={qso.id}>
                    <td>{qso.call}</td>
                    <td>{qso.qsoDate}</td>
                    <td>{qso.timeOn}</td>
                    <td>{qso.band}</td>
                    <td>{qso.freq}</td>
                    <td>{qso.mode}</td>
                    <td>
                      {qso.rstSent}/{qso.rstRcvd}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onEdit(qso)}
                      >
                        Edit
                      </button>
                      {confirmDelete === qso.id ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => {
                              onDelete(qso.id);
                              setConfirmDelete(null);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setConfirmDelete(qso.id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {bottomPad > 0 && (
                  <tr aria-hidden="true">
                    <td colSpan={8} style={{ height: bottomPad, padding: 0, border: 'none' }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

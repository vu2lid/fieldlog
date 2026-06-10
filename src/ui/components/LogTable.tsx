import { useMemo, useState } from 'react';
import type { Qso } from '../../core/model';

type SortKey = keyof Qso | 'none';
type SortDir = 'asc' | 'desc';

interface LogTableProps {
  qsos: Qso[];
  onEdit: (qso: Qso) => void;
  onDelete: (id: string) => void;
}

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 25;

export function LogTable({ qsos, onEdit, onDelete }: LogTableProps) {
  const [search, setSearch] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('qsoDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [scrollTop, setScrollTop] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const bands = useMemo(() => [...new Set(qsos.map((q) => q.band))].sort(), [qsos]);
  const modes = useMemo(() => [...new Set(qsos.map((q) => q.mode))].sort(), [qsos]);

  const filtered = useMemo(() => {
    const q = search.toUpperCase();
    let list = qsos.filter((row) => {
      if (q && !row.call.toUpperCase().includes(q)) return false;
      if (bandFilter && row.band !== bandFilter) return false;
      if (modeFilter && row.mode !== modeFilter) return false;
      return true;
    });

    if (sortKey !== 'none') {
      list = [...list].sort((a, b) => {
        const av = a[sortKey as keyof Qso];
        const bv = b[sortKey as keyof Qso];
        const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [qsos, search, bandFilter, modeFilter, sortKey, sortDir]);

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
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search by callsign"
        />
        <select value={bandFilter} onChange={(e) => setBandFilter(e.target.value)} aria-label="Filter by band">
          <option value="">All bands</option>
          {bands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} aria-label="Filter by mode">
          <option value="">All modes</option>
          {modes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
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
              <th scope="col" onClick={() => toggleSort('call')}>
                Call
              </th>
              <th scope="col" onClick={() => toggleSort('qsoDate')}>
                Date
              </th>
              <th scope="col" onClick={() => toggleSort('timeOn')}>
                Time
              </th>
              <th scope="col" onClick={() => toggleSort('band')}>
                Band
              </th>
              <th scope="col" onClick={() => toggleSort('freq')}>
                Freq
              </th>
              <th scope="col" onClick={() => toggleSort('mode')}>
                Mode
              </th>
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
                      <button type="button" className="btn btn-secondary" onClick={() => onEdit(qso)}>
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
import { BAND_PLAN, MODES } from '../../core/bands';
import type { SessionContext } from '../../core/model';

interface SessionPanelProps {
  session: SessionContext;
  sessionQsoCount: number;
  totalQsoCount: number;
  onChange: (session: SessionContext) => void;
}

export function SessionPanel({
  session,
  sessionQsoCount,
  totalQsoCount,
  onChange,
}: SessionPanelProps) {
  const update = (patch: Partial<SessionContext>) => onChange({ ...session, ...patch });

  return (
    <section className="panel" aria-labelledby="session-heading">
      <h2 id="session-heading">Session / Activation</h2>
      <div className="session-grid">
        <div className="form-field">
          <label htmlFor="station-callsign">Station callsign</label>
          <input
            id="station-callsign"
            value={session.stationCallsign}
            onChange={(e) => update({ stationCallsign: e.target.value.toUpperCase() })}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="operator-callsign">Operator callsign</label>
          <input
            id="operator-callsign"
            value={session.operatorCallsign}
            onChange={(e) => update({ operatorCallsign: e.target.value.toUpperCase() })}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="my-grid">My grid square</label>
          <input
            id="my-grid"
            value={session.myGridSquare}
            onChange={(e) => update({ myGridSquare: e.target.value.toUpperCase() })}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="my-pota">My POTA ref</label>
          <input
            id="my-pota"
            value={session.myPotaRef}
            onChange={(e) => update({ myPotaRef: e.target.value.toUpperCase() })}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="my-sota">My SOTA ref</label>
          <input
            id="my-sota"
            value={session.mySotaRef}
            onChange={(e) => update({ mySotaRef: e.target.value.toUpperCase() })}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="dupe-mode">Dupe check</label>
          <select
            id="dupe-mode"
            value={session.dupeMode}
            onChange={(e) => update({ dupeMode: e.target.value as SessionContext['dupeMode'] })}
          >
            <option value="band-mode">Same band + mode</option>
            <option value="any">Any band</option>
          </select>
        </div>
      </div>
      <p style={{ marginTop: '1rem' }}>
        Session QSOs: <span className="qso-counter">{sessionQsoCount}</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: '0.75rem' }}>
          Log total: {totalQsoCount}
        </span>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginLeft: '0.75rem' }}
          onClick={() => update({ sessionStartedAt: Date.now() })}
        >
          New session
        </button>
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
        Band ({session.band}) and mode ({session.mode}) persist between QSOs on the Log tab.
      </p>
      <details style={{ marginTop: '0.75rem' }}>
        <summary>Band / mode defaults</summary>
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="form-field">
            <label htmlFor="session-band">Band</label>
            <select
              id="session-band"
              value={session.band}
              onChange={(e) => {
                const band = e.target.value;
                const def = BAND_PLAN.find((b) => b.name === band);
                update({ band, freq: def?.defaultMHz ?? session.freq });
              }}
            >
              {BAND_PLAN.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="session-mode">Mode</label>
            <select
              id="session-mode"
              value={session.mode}
              onChange={(e) => update({ mode: e.target.value })}
            >
              {MODES.map((m) => (
                <option key={m.mode} value={m.mode}>
                  {m.mode}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>
    </section>
  );
}

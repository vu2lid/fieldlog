import { useRef, useState } from 'react';
import { bandToDefaultFrequency, defaultRstForMode, frequencyToBand } from '../../core/bands';
import { isDupe } from '../../core/dupes';
import {
  createQsoId,
  getUtcNow,
  type Qso,
  type SessionContext,
  validateCallsign,
} from '../../core/model';

export interface EntryDraft {
  call: string;
  rstSent: string;
  rstRcvd: string;
  name: string;
  gridSquare: string;
  comment: string;
  potaRef: string;
  sotaRef: string;
  qsoDate: string;
  timeOn: string;
  freq: string;
}

interface EntryFormProps {
  session: SessionContext;
  qsos: Qso[];
  onLog: (qso: Qso) => Promise<void>;
  onSessionChange: (session: SessionContext) => void;
}

function initialDraft(session: SessionContext): EntryDraft {
  const utc = getUtcNow();
  const rst = defaultRstForMode(session.mode);
  return {
    call: '',
    rstSent: rst.sent,
    rstRcvd: rst.rcvd,
    name: '',
    gridSquare: '',
    comment: '',
    potaRef: '',
    sotaRef: '',
    qsoDate: utc.qsoDate,
    timeOn: utc.timeOn,
    freq: String(session.freq),
  };
}

export function EntryForm({ session, qsos, onLog, onSessionChange }: EntryFormProps) {
  const [draft, setDraft] = useState(() => initialDraft(session));
  const [flash, setFlash] = useState('');
  const [callWarning, setCallWarning] = useState<string | null>(null);
  const callRef = useRef<HTMLInputElement>(null);

  const dupe = draft.call
    ? isDupe(qsos, { call: draft.call, band: session.band, mode: session.mode }, session.dupeMode)
    : { isDupe: false, matches: [] };

  const update = (patch: Partial<EntryDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const handleLog = async () => {
    if (!draft.call.trim()) {
      setCallWarning('Callsign is required');
      callRef.current?.focus();
      return;
    }

    const freq = parseFloat(draft.freq) || session.freq;
    const bandFromFreq = frequencyToBand(freq);
    const band = bandFromFreq ?? session.band;

    if (bandFromFreq && bandFromFreq !== session.band) {
      onSessionChange({ ...session, band, freq });
    }

    const now = Date.now();
    const qso: Qso = {
      id: createQsoId(),
      call: draft.call.toUpperCase(),
      qsoDate: draft.qsoDate,
      timeOn: draft.timeOn,
      band,
      freq,
      mode: session.mode,
      rstSent: draft.rstSent,
      rstRcvd: draft.rstRcvd,
      name: draft.name || undefined,
      gridSquare: draft.gridSquare || undefined,
      comment: draft.comment || undefined,
      potaRef: draft.potaRef || undefined,
      sotaRef: draft.sotaRef || undefined,
      stationCallsign: session.stationCallsign || undefined,
      operator: session.operatorCallsign || undefined,
      myGridSquare: session.myGridSquare || undefined,
      myPotaRef: session.myPotaRef || undefined,
      mySotaRef: session.mySotaRef || undefined,
      mySig: session.myPotaRef ? 'POTA' : session.mySotaRef ? 'SOTA' : undefined,
      mySigInfo: session.myPotaRef || session.mySotaRef || undefined,
      sig: draft.potaRef ? 'POTA' : draft.sotaRef ? 'SOTA' : undefined,
      sigInfo: draft.potaRef || draft.sotaRef || undefined,
      createdAt: now,
      updatedAt: now,
    };

    await onLog(qso);
    const utc = getUtcNow();
    const rst = defaultRstForMode(session.mode);
    setDraft({
      call: '',
      rstSent: rst.sent,
      rstRcvd: rst.rcvd,
      name: '',
      gridSquare: '',
      comment: '',
      potaRef: '',
      sotaRef: '',
      qsoDate: utc.qsoDate,
      timeOn: utc.timeOn,
      freq: String(freq),
    });
    setFlash(`Logged ${qso.call}`);
    window.setTimeout(() => setFlash(''), 2000);
    callRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      void handleLog();
    }
  };

  return (
    <section className="panel" aria-labelledby="entry-heading" onKeyDown={handleKeyDown}>
      <h2 id="entry-heading">Log QSO</h2>
      {flash && (
        <div className="flash-success" role="status">
          {flash}
        </div>
      )}
      <div className="form-grid" style={{ marginTop: flash ? '1rem' : 0 }}>
        <div className="form-field">
          <label htmlFor="call">Callsign *</label>
          <input
            id="call"
            ref={callRef}
            value={draft.call}
            onChange={(e) => {
              const call = e.target.value.toUpperCase();
              update({ call });
              const warn = validateCallsign(call);
              setCallWarning(warn?.message ?? null);
            }}
            autoComplete="off"
            aria-describedby={dupe.isDupe ? 'dupe-hint' : undefined}
            autoFocus
          />
          {dupe.isDupe && (
            <span id="dupe-hint" className="dupe-badge" role="status">
              DUPE — worked before
            </span>
          )}
          {callWarning && !dupe.isDupe && (
            <span style={{ color: 'var(--warning)', fontSize: '0.8rem' }}>{callWarning}</span>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="rst-sent">RST sent</label>
          <input
            id="rst-sent"
            value={draft.rstSent}
            onChange={(e) => update({ rstSent: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="rst-rcvd">RST rcvd</label>
          <input
            id="rst-rcvd"
            value={draft.rstRcvd}
            onChange={(e) => update({ rstRcvd: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="band-display">Band</label>
          <input id="band-display" value={session.band} readOnly aria-readonly="true" />
        </div>
        <div className="form-field">
          <label htmlFor="mode-display">Mode</label>
          <input id="mode-display" value={session.mode} readOnly aria-readonly="true" />
        </div>
        <div className="form-field">
          <label htmlFor="freq">Frequency (MHz)</label>
          <input
            id="freq"
            type="number"
            step="0.001"
            value={draft.freq}
            onChange={(e) => {
              const freq = e.target.value;
              update({ freq });
              const f = parseFloat(freq);
              if (!Number.isNaN(f)) {
                const band = frequencyToBand(f);
                if (band) onSessionChange({ ...session, band, freq: f });
              }
            }}
          />
        </div>
        <div className="form-field">
          <label htmlFor="qso-date">QSO date (UTC)</label>
          <input
            id="qso-date"
            value={draft.qsoDate}
            onChange={(e) => update({ qsoDate: e.target.value })}
            placeholder="YYYYMMDD"
          />
        </div>
        <div className="form-field">
          <label htmlFor="time-on">Time on (UTC)</label>
          <input
            id="time-on"
            value={draft.timeOn}
            onChange={(e) => update({ timeOn: e.target.value })}
            placeholder="HHMMSS"
          />
        </div>
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" value={draft.name} onChange={(e) => update({ name: e.target.value })} />
        </div>
        <div className="form-field">
          <label htmlFor="grid">Grid</label>
          <input
            id="grid"
            value={draft.gridSquare}
            onChange={(e) => update({ gridSquare: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="pota-ref">Their POTA ref</label>
          <input
            id="pota-ref"
            value={draft.potaRef}
            onChange={(e) => update({ potaRef: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="sota-ref">Their SOTA ref</label>
          <input
            id="sota-ref"
            value={draft.sotaRef}
            onChange={(e) => update({ sotaRef: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="comment">Comment</label>
          <textarea
            id="comment"
            rows={2}
            value={draft.comment}
            onChange={(e) => update({ comment: e.target.value })}
          />
        </div>
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={() => void handleLog()}>
          Log QSO (Enter)
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const utc = getUtcNow();
            update({ qsoDate: utc.qsoDate, timeOn: utc.timeOn });
          }}
        >
          Refresh UTC time
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            const def = bandToDefaultFrequency(session.band);
            if (def !== null) {
              update({ freq: String(def) });
              onSessionChange({ ...session, freq: def });
            }
          }}
        >
          Reset freq to band default
        </button>
      </div>
    </section>
  );
}

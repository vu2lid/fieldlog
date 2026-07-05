import { useRef, useState } from 'react';
import { bandToDefaultFrequency, defaultRstForMode, frequencyToBand } from '../../core/bands';
import { isDupe } from '../../core/dupes';
import {
  createQsoId,
  getUtcNow,
  type Qso,
  type SessionContext,
  type ValidationIssue,
  validateCallsign,
  validateQso,
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

const FIELD_INPUT_IDS: Partial<Record<keyof Qso, string>> = {
  call: 'call',
  rstSent: 'rst-sent',
  rstRcvd: 'rst-rcvd',
  freq: 'freq',
  qsoDate: 'qso-date',
  timeOn: 'time-on',
  gridSquare: 'grid',
};

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
  const [liveCallIssue, setLiveCallIssue] = useState<ValidationIssue | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [warningsPending, setWarningsPending] = useState(false);
  const [saving, setSaving] = useState(false);
  // Secondary fields start collapsed on phone-sized screens (narrow portrait
  // or short landscape) so the Log button stays reachable without scrolling.
  const [moreOpen, setMoreOpen] = useState(
    () => !window.matchMedia('(max-width: 600px), (max-height: 500px)').matches,
  );
  const callRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  // The band the QSO will actually be logged under: derived from the typed
  // frequency when it maps to a band, otherwise the session band.
  const parsedFreq = parseFloat(draft.freq);
  const displayFreq = Number.isFinite(parsedFreq) && parsedFreq > 0 ? parsedFreq : session.freq;
  const effectiveBand = frequencyToBand(displayFreq) ?? session.band;

  const dupe = draft.call
    ? isDupe(qsos, { call: draft.call, band: effectiveBand, mode: session.mode }, session.dupeMode)
    : { isDupe: false, matches: [] };

  const update = (patch: Partial<EntryDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationIssues([]);
    setWarningsPending(false);
  };

  const issueFor = (field: keyof Qso) =>
    validationIssues.find((candidate) => candidate.field === field);
  const describedBy = (field: keyof Qso, additionalId?: string) => {
    const ids = [issueFor(field) ? `entry-issue-${field}` : undefined, additionalId].filter(
      Boolean,
    );
    return ids.length > 0 ? ids.join(' ') : undefined;
  };
  const hasError = (field: keyof Qso) => issueFor(field)?.severity === 'error';

  const focusIssue = (validationIssue: ValidationIssue) => {
    if (validationIssue.field === 'gridSquare') setMoreOpen(true);
    const inputId = FIELD_INPUT_IDS[validationIssue.field];
    if (inputId) {
      window.setTimeout(() => document.getElementById(inputId)?.focus(), 0);
    }
  };

  const handleLog = async () => {
    if (savingRef.current) return;

    const freq = parsedFreq;
    const band = effectiveBand;

    const now = Date.now();
    const qso: Qso = {
      id: createQsoId(),
      call: draft.call.trim().toUpperCase(),
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

    const validation = validateQso(qso);
    setValidationIssues(validation.issues);
    if (!validation.valid) {
      setWarningsPending(false);
      focusIssue(validation.errors[0]!);
      return;
    }
    if (validation.warnings.length > 0 && !warningsPending) {
      setWarningsPending(true);
      focusIssue(validation.warnings[0]!);
      return;
    }

    if (band !== session.band) {
      onSessionChange({ ...session, band, freq });
    }

    savingRef.current = true;
    setSaving(true);
    try {
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
      setLiveCallIssue(null);
      setValidationIssues([]);
      setWarningsPending(false);
      window.setTimeout(() => setFlash(''), 2000);
    } catch {
      // The parent reports the storage error. Preserve the draft for retry.
    } finally {
      savingRef.current = false;
      setSaving(false);
      callRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      void handleLog();
    }
  };

  const validationErrors = validationIssues.filter((candidate) => candidate.severity === 'error');
  const validationWarnings = validationIssues.filter(
    (candidate) => candidate.severity === 'warning',
  );

  return (
    <section className="panel" aria-labelledby="entry-heading" onKeyDown={handleKeyDown}>
      <h2 id="entry-heading">Log QSO</h2>
      {flash && (
        <div className="flash-success" role="status">
          {flash}
        </div>
      )}
      {validationIssues.length > 0 && (
        <div
          className={`validation-summary ${
            validationErrors.length > 0 ? 'validation-summary-error' : 'validation-summary-warning'
          }`}
          role={validationErrors.length > 0 ? 'alert' : 'status'}
        >
          <strong>
            {validationErrors.length > 0
              ? `Fix ${validationErrors.length} error${validationErrors.length === 1 ? '' : 's'} before logging.`
              : `Review ${validationWarnings.length} warning${
                  validationWarnings.length === 1 ? '' : 's'
                }, then choose Log anyway.`}
          </strong>
          <ul>
            {validationIssues.map((validationIssue) => (
              <li
                id={`entry-issue-${validationIssue.field}`}
                key={`${validationIssue.field}-${validationIssue.code}`}
              >
                {validationIssue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        className="form-grid"
        style={{ marginTop: flash || validationIssues.length > 0 ? '1rem' : 0 }}
      >
        <div className="form-field">
          <label htmlFor="call">Callsign *</label>
          <input
            id="call"
            ref={callRef}
            value={draft.call}
            onChange={(e) => {
              const call = e.target.value.toUpperCase();
              update({ call });
              setLiveCallIssue(validateCallsign(call));
            }}
            autoComplete="off"
            aria-invalid={hasError('call') || liveCallIssue?.severity === 'error' || undefined}
            aria-describedby={describedBy(
              'call',
              dupe.isDupe
                ? 'dupe-hint'
                : liveCallIssue && !issueFor('call')
                  ? 'call-live-issue'
                  : undefined,
            )}
            autoFocus
          />
          {dupe.isDupe && (
            <span id="dupe-hint" className="dupe-badge" role="status">
              DUPE — worked before
            </span>
          )}
          {liveCallIssue && !dupe.isDupe && !issueFor('call') && (
            <span
              id="call-live-issue"
              className={liveCallIssue.severity === 'error' ? 'field-error' : 'field-warning'}
            >
              {liveCallIssue.message}
            </span>
          )}
        </div>
        <div className="form-field">
          <label htmlFor="rst-sent">RST sent</label>
          <input
            id="rst-sent"
            value={draft.rstSent}
            onChange={(e) => update({ rstSent: e.target.value })}
            aria-invalid={hasError('rstSent') || undefined}
            aria-describedby={describedBy('rstSent')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="rst-rcvd">RST rcvd</label>
          <input
            id="rst-rcvd"
            value={draft.rstRcvd}
            onChange={(e) => update({ rstRcvd: e.target.value })}
            aria-invalid={hasError('rstRcvd') || undefined}
            aria-describedby={describedBy('rstRcvd')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="band-display">Band</label>
          <input id="band-display" value={effectiveBand} readOnly aria-readonly="true" />
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
            aria-invalid={hasError('freq') || undefined}
            aria-describedby={describedBy('freq')}
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
            aria-invalid={hasError('qsoDate') || undefined}
            aria-describedby={describedBy('qsoDate')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="time-on">Time on (UTC)</label>
          <input
            id="time-on"
            value={draft.timeOn}
            onChange={(e) => update({ timeOn: e.target.value })}
            placeholder="HHMMSS"
            aria-invalid={hasError('timeOn') || undefined}
            aria-describedby={describedBy('timeOn')}
          />
        </div>
      </div>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void handleLog()}
        >
          {saving ? 'Saving…' : warningsPending ? 'Log anyway (Enter)' : 'Log QSO (Enter)'}
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
      <details
        className="more-fields"
        open={moreOpen}
        onToggle={(e) => setMoreOpen(e.currentTarget.open)}
      >
        <summary>More fields — name, grid, P2P refs, comment</summary>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="form-field">
            <label htmlFor="grid">Grid</label>
            <input
              id="grid"
              value={draft.gridSquare}
              onChange={(e) => update({ gridSquare: e.target.value.toUpperCase() })}
              aria-invalid={hasError('gridSquare') || undefined}
              aria-describedby={describedBy('gridSquare')}
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
      </details>
    </section>
  );
}

import { useEffect, useRef, useState } from 'react';
import { normalizeBandName } from '../../core/bands';
import { type Qso, type ValidationIssue, validateQso } from '../../core/model';

interface EditQsoModalProps {
  qso: Qso;
  onSave: (qso: Qso) => Promise<void>;
  onClose: () => void;
}

const FOCUSABLE = 'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])';

const FIELD_INPUT_IDS: Partial<Record<keyof Qso, string>> = {
  call: 'edit-call',
  qsoDate: 'edit-date',
  timeOn: 'edit-time-on',
  timeOff: 'edit-time-off',
  band: 'edit-band',
  freq: 'edit-freq',
  mode: 'edit-mode',
  rstSent: 'edit-rst-sent',
  rstRcvd: 'edit-rst-rcvd',
  gridSquare: 'edit-grid',
  myGridSquare: 'edit-my-grid',
};

const CONTACT_FIELDS = new Set<keyof Qso>([
  'name',
  'qth',
  'gridSquare',
  'comment',
  'txPwr',
  'stationCallsign',
  'operator',
  'myGridSquare',
]);

function emptyToUndefined(value: string): string | undefined {
  return value === '' ? undefined : value;
}

export function EditQsoModal({ qso, onSave, onClose }: EditQsoModalProps) {
  const [draft, setDraft] = useState({ ...qso });
  const [freqText, setFreqText] = useState(String(qso.freq));
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [warningsPending, setWarningsPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  const clearValidation = () => {
    setValidationIssues([]);
    setWarningsPending(false);
    setSaveError('');
  };

  const update = <K extends keyof Qso>(field: K, value: Qso[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    clearValidation();
  };

  const updateOptional = (field: keyof Qso, value: string) => {
    update(field, emptyToUndefined(value));
  };

  const issueFor = (field: keyof Qso) =>
    validationIssues.find((candidate) => candidate.field === field);
  const validationProps = (field: keyof Qso) => ({
    'aria-invalid': issueFor(field)?.severity === 'error' || undefined,
    'aria-describedby': issueFor(field) ? `edit-issue-${field}` : undefined,
  });

  const focusIssue = (validationIssue: ValidationIssue) => {
    if (CONTACT_FIELDS.has(validationIssue.field)) setContactOpen(true);
    const inputId = FIELD_INPUT_IDS[validationIssue.field];
    if (inputId) {
      window.setTimeout(() => document.getElementById(inputId)?.focus(), 0);
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;

    const candidate: Qso = {
      ...draft,
      call: draft.call.trim().toUpperCase(),
      band: normalizeBandName(draft.band.trim()),
      freq: Number.parseFloat(freqText),
      mode: draft.mode.trim().toUpperCase(),
      submode: draft.submode?.trim().toUpperCase() || undefined,
      updatedAt: Date.now(),
    };
    const validation = validateQso(candidate);
    setValidationIssues(validation.issues);
    setSaveError('');

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

    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(candidate);
    } catch {
      setSaveError('QSO could not be saved. Your edits are still available for retry.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!savingRef.current) onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const validationErrors = validationIssues.filter((candidate) => candidate.severity === 'error');
  const validationWarnings = validationIssues.filter(
    (candidate) => candidate.severity === 'warning',
  );

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-qso-title"
      className="panel edit-qso-dialog"
      onKeyDown={handleKeyDown}
    >
      <h2 id="edit-qso-title">Edit QSO — {qso.call}</h2>

      {saveError && (
        <p className="error-banner" role="alert">
          {saveError}
        </p>
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
              ? `Fix ${validationErrors.length} error${validationErrors.length === 1 ? '' : 's'} before saving.`
              : `Review ${validationWarnings.length} warning${
                  validationWarnings.length === 1 ? '' : 's'
                }, then choose Save anyway.`}
          </strong>
          <ul>
            {validationIssues.map((validationIssue) => (
              <li
                id={`edit-issue-${validationIssue.field}`}
                key={`${validationIssue.field}-${validationIssue.code}`}
              >
                {validationIssue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="edit-section-heading">Core QSO fields</h3>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="edit-call">Call</label>
          <input
            id="edit-call"
            value={draft.call}
            onChange={(event) => update('call', event.target.value.toUpperCase())}
            {...validationProps('call')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-date">Date (UTC)</label>
          <input
            id="edit-date"
            value={draft.qsoDate}
            placeholder="YYYYMMDD"
            onChange={(event) => update('qsoDate', event.target.value)}
            {...validationProps('qsoDate')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-time-on">Time on (UTC)</label>
          <input
            id="edit-time-on"
            value={draft.timeOn}
            placeholder="HHMMSS"
            onChange={(event) => update('timeOn', event.target.value)}
            {...validationProps('timeOn')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-time-off">Time off (UTC)</label>
          <input
            id="edit-time-off"
            value={draft.timeOff ?? ''}
            placeholder="HHMMSS"
            onChange={(event) => updateOptional('timeOff', event.target.value)}
            {...validationProps('timeOff')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-band">Band</label>
          <input
            id="edit-band"
            value={draft.band}
            onChange={(event) => update('band', event.target.value)}
            {...validationProps('band')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-freq">Frequency (MHz)</label>
          <input
            id="edit-freq"
            type="number"
            step="0.001"
            value={freqText}
            onChange={(event) => {
              setFreqText(event.target.value);
              clearValidation();
            }}
            {...validationProps('freq')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-mode">Mode</label>
          <input
            id="edit-mode"
            value={draft.mode}
            onChange={(event) => update('mode', event.target.value.toUpperCase())}
            {...validationProps('mode')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-submode">Submode</label>
          <input
            id="edit-submode"
            value={draft.submode ?? ''}
            onChange={(event) => updateOptional('submode', event.target.value.toUpperCase())}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-rst-sent">RST sent</label>
          <input
            id="edit-rst-sent"
            value={draft.rstSent}
            onChange={(event) => update('rstSent', event.target.value)}
            {...validationProps('rstSent')}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-rst-rcvd">RST received</label>
          <input
            id="edit-rst-rcvd"
            value={draft.rstRcvd}
            onChange={(event) => update('rstRcvd', event.target.value)}
            {...validationProps('rstRcvd')}
          />
        </div>
      </div>

      <details
        className="edit-field-group"
        open={contactOpen}
        onToggle={(event) => setContactOpen(event.currentTarget.open)}
      >
        <summary>Contact and station fields</summary>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="edit-name">Name</label>
            <input
              id="edit-name"
              value={draft.name ?? ''}
              onChange={(event) => updateOptional('name', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-qth">QTH</label>
            <input
              id="edit-qth"
              value={draft.qth ?? ''}
              onChange={(event) => updateOptional('qth', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-grid">Their grid</label>
            <input
              id="edit-grid"
              value={draft.gridSquare ?? ''}
              onChange={(event) => updateOptional('gridSquare', event.target.value.toUpperCase())}
              {...validationProps('gridSquare')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-station-call">Station callsign</label>
            <input
              id="edit-station-call"
              value={draft.stationCallsign ?? ''}
              onChange={(event) =>
                updateOptional('stationCallsign', event.target.value.toUpperCase())
              }
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-operator">Operator</label>
            <input
              id="edit-operator"
              value={draft.operator ?? ''}
              onChange={(event) => updateOptional('operator', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-my-grid">My grid</label>
            <input
              id="edit-my-grid"
              value={draft.myGridSquare ?? ''}
              onChange={(event) => updateOptional('myGridSquare', event.target.value.toUpperCase())}
              {...validationProps('myGridSquare')}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-tx-power">TX power</label>
            <input
              id="edit-tx-power"
              value={draft.txPwr ?? ''}
              onChange={(event) => updateOptional('txPwr', event.target.value)}
            />
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="edit-comment">Comment</label>
            <textarea
              id="edit-comment"
              rows={2}
              value={draft.comment ?? ''}
              onChange={(event) => updateOptional('comment', event.target.value)}
            />
          </div>
        </div>
      </details>

      <details
        className="edit-field-group"
        open={programOpen}
        onToggle={(event) => setProgramOpen(event.currentTarget.open)}
      >
        <summary>Program, signal, and contest fields</summary>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="edit-pota-ref">Their POTA ref</label>
            <input
              id="edit-pota-ref"
              value={draft.potaRef ?? ''}
              onChange={(event) => updateOptional('potaRef', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-my-pota-ref">My POTA ref</label>
            <input
              id="edit-my-pota-ref"
              value={draft.myPotaRef ?? ''}
              onChange={(event) => updateOptional('myPotaRef', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-sota-ref">Their SOTA ref</label>
            <input
              id="edit-sota-ref"
              value={draft.sotaRef ?? ''}
              onChange={(event) => updateOptional('sotaRef', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-my-sota-ref">My SOTA ref</label>
            <input
              id="edit-my-sota-ref"
              value={draft.mySotaRef ?? ''}
              onChange={(event) => updateOptional('mySotaRef', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-sig">Their SIG</label>
            <input
              id="edit-sig"
              value={draft.sig ?? ''}
              onChange={(event) => updateOptional('sig', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-sig-info">Their SIG info</label>
            <input
              id="edit-sig-info"
              value={draft.sigInfo ?? ''}
              onChange={(event) => updateOptional('sigInfo', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-my-sig">My SIG</label>
            <input
              id="edit-my-sig"
              value={draft.mySig ?? ''}
              onChange={(event) => updateOptional('mySig', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-my-sig-info">My SIG info</label>
            <input
              id="edit-my-sig-info"
              value={draft.mySigInfo ?? ''}
              onChange={(event) => updateOptional('mySigInfo', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-contest-id">Contest ID</label>
            <input
              id="edit-contest-id"
              value={draft.contestId ?? ''}
              onChange={(event) => updateOptional('contestId', event.target.value.toUpperCase())}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-stx">Sent serial</label>
            <input
              id="edit-stx"
              value={draft.stx ?? ''}
              onChange={(event) => updateOptional('stx', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-srx">Received serial</label>
            <input
              id="edit-srx"
              value={draft.srx ?? ''}
              onChange={(event) => updateOptional('srx', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-stx-string">Sent exchange</label>
            <input
              id="edit-stx-string"
              value={draft.stxString ?? ''}
              onChange={(event) => updateOptional('stxString', event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-srx-string">Received exchange</label>
            <input
              id="edit-srx-string"
              value={draft.srxString ?? ''}
              onChange={(event) => updateOptional('srxString', event.target.value)}
            />
          </div>
        </div>
        <p className="supporting-text">Unknown imported ADIF fields are preserved unchanged.</p>
      </details>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? 'Saving…' : warningsPending ? 'Save anyway' : 'Save'}
        </button>
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

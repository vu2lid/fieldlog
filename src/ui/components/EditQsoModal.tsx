import { useEffect, useRef, useState } from 'react';
import type { Qso } from '../../core/model';

interface EditQsoModalProps {
  qso: Qso;
  onSave: (qso: Qso) => Promise<void>;
  onClose: () => void;
}

const FOCUSABLE = 'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])';

export function EditQsoModal({ qso, onSave, onClose }: EditQsoModalProps) {
  const [draft, setDraft] = useState({ ...qso });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-qso-title"
      className="panel"
      style={{ position: 'fixed', inset: '10%', zIndex: 100, overflow: 'auto', maxHeight: '80vh' }}
      onKeyDown={handleKeyDown}
    >
      <h2 id="edit-qso-title">Edit QSO — {qso.call}</h2>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="edit-call">Call</label>
          <input
            id="edit-call"
            value={draft.call}
            onChange={(e) => setDraft({ ...draft, call: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-date">Date</label>
          <input
            id="edit-date"
            value={draft.qsoDate}
            onChange={(e) => setDraft({ ...draft, qsoDate: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-time">Time on</label>
          <input
            id="edit-time"
            value={draft.timeOn}
            onChange={(e) => setDraft({ ...draft, timeOn: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-band">Band</label>
          <input
            id="edit-band"
            value={draft.band}
            onChange={(e) => setDraft({ ...draft, band: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-freq">Freq</label>
          <input
            id="edit-freq"
            type="number"
            step="0.001"
            value={draft.freq}
            onChange={(e) => setDraft({ ...draft, freq: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-mode">Mode</label>
          <input
            id="edit-mode"
            value={draft.mode}
            onChange={(e) => setDraft({ ...draft, mode: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-rst-sent">RST sent</label>
          <input
            id="edit-rst-sent"
            value={draft.rstSent}
            onChange={(e) => setDraft({ ...draft, rstSent: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="edit-rst-rcvd">RST rcvd</label>
          <input
            id="edit-rst-rcvd"
            value={draft.rstRcvd}
            onChange={(e) => setDraft({ ...draft, rstRcvd: e.target.value })}
          />
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="edit-comment">Comment</label>
          <textarea
            id="edit-comment"
            rows={2}
            value={draft.comment ?? ''}
            onChange={(e) => setDraft({ ...draft, comment: e.target.value })}
          />
        </div>
      </div>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void onSave({ ...draft, updatedAt: Date.now() })}
        >
          Save
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

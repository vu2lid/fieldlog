import { useMemo, useRef, useState } from 'react';
import { parseAdi, type ParseError } from '../../core/adif';
import { adifRecordToQso, type Qso, type QsoValidationResult, validateQso } from '../../core/model';
import { mergeQsos } from '../../core/dupes';
import type { BackupReminderSettings, BackupStatus } from '../backup';
import { downloadQsosAsAdi } from '../exportAdi';

interface ImportExportProps {
  qsos: Qso[];
  filteredQsos?: Qso[];
  backupSettings: BackupReminderSettings;
  backupStatus: BackupStatus;
  onBackupSettingsChange: (settings: BackupReminderSettings) => void;
  onFullExport: () => void;
  onImport: (added: Qso[]) => Promise<void>;
}

interface AssessedRecord {
  index: number;
  qso: Qso;
  validation: QsoValidationResult;
}

interface ImportPreview {
  fileName: string;
  parseErrors: ParseError[];
  records: AssessedRecord[];
}

interface Notice {
  kind: 'success' | 'error';
  message: string;
}

type ImportPhase = 'idle' | 'analyzing' | 'saving';

const DETAIL_LIMIT = 20;

function recordLabel(record: AssessedRecord): string {
  return record.qso.call || `Record ${record.index + 1}`;
}

export function ImportExport({
  qsos,
  filteredQsos,
  backupSettings,
  backupStatus,
  onBackupSettingsChange,
  onFullExport,
  onImport,
}: ImportExportProps) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const importable = useMemo(
    () =>
      preview?.records.filter((record) => record.validation.valid).map((record) => record.qso) ??
      [],
    [preview],
  );
  const importPlan = useMemo(() => mergeQsos(qsos, importable), [qsos, importable]);
  const invalidRecords = preview?.records.filter((record) => !record.validation.valid) ?? [];
  const warningRecords =
    preview?.records.filter(
      (record) => record.validation.valid && record.validation.warnings.length > 0,
    ) ?? [];
  const busy = phase !== 'idle';

  const handleFile = async (file: File) => {
    if (busyRef.current) return;

    busyRef.current = true;
    setPhase('analyzing');
    setNotice(null);
    setPreview(null);
    try {
      const text = await file.text();
      const result = parseAdi(text);
      const records = result.records.map((record, index) => {
        const qso = adifRecordToQso(record);
        return { index, qso, validation: validateQso(qso) };
      });
      setPreview({ fileName: file.name, parseErrors: result.errors, records });
    } catch {
      setNotice({
        kind: 'error',
        message: 'Could not analyze this file. Your existing log is unchanged.',
      });
    } finally {
      busyRef.current = false;
      setPhase('idle');
    }
  };

  const confirmImport = async () => {
    if (!preview || importPlan.added.length === 0 || busyRef.current) return;

    busyRef.current = true;
    setPhase('saving');
    setNotice(null);
    try {
      await onImport(importPlan.added);
      const excludedNote =
        invalidRecords.length > 0 ? `, ${invalidRecords.length} invalid excluded` : '';
      const parserNote =
        preview.parseErrors.length > 0
          ? `, ${preview.parseErrors.length} parser warning(s) reviewed`
          : '';
      setNotice({
        kind: 'success',
        message: `Import complete: ${importPlan.added.length} added, ${importPlan.skipped.length} skipped (duplicates)${excludedNote}${parserNote}`,
      });
      setPreview(null);
    } catch {
      setNotice({
        kind: 'error',
        message: 'Import failed — no QSOs were added. Review the error and retry this preview.',
      });
    } finally {
      busyRef.current = false;
      setPhase('idle');
    }
  };

  const exportLog = (subset: Qso[], filename: string, fullLog: boolean) => {
    try {
      downloadQsosAsAdi(subset, filename);
      if (fullLog) onFullExport();
      setNotice({
        kind: 'success',
        message: `Export started for ${subset.length} QSO(s) to ${filename}`,
      });
    } catch {
      setNotice({ kind: 'error', message: 'Could not prepare the ADIF export.' });
    }
  };

  return (
    <section className="panel" aria-labelledby="import-export-heading">
      <h2 id="import-export-heading">Import / Export</h2>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        aria-disabled={busy}
        onDragOver={(event) => {
          event.preventDefault();
          if (busy) return;
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (busy) return;
          const file = event.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onClick={() => {
          if (!busy) fileRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (!busy && (event.key === 'Enter' || event.key === ' ')) fileRef.current?.click();
        }}
      >
        {phase === 'analyzing'
          ? 'Analyzing…'
          : preview
            ? 'Drop another .adi file here or click to replace this preview'
            : 'Drop .adi file here or click to browse'}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".adi,.adif,.txt"
        disabled={busy}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = '';
        }}
      />
      <p className="supporting-text">
        Selecting a file only creates a preview. Invalid records are excluded, duplicates are
        skipped, and nothing changes until you confirm the import.
      </p>

      {preview && (
        <section className="import-preview" aria-labelledby="import-preview-heading">
          <h3 id="import-preview-heading">Import preview — {preview.fileName}</h3>
          <ul className="import-counts" aria-label="Import preview counts">
            <li>
              <strong>{preview.records.length}</strong> records found
            </li>
            <li>
              <strong>{importPlan.added.length}</strong> ready to import
            </li>
            <li>
              <strong>{importPlan.skipped.length}</strong> duplicates skipped
            </li>
            <li>
              <strong>{invalidRecords.length}</strong> invalid excluded
            </li>
            <li>
              <strong>{warningRecords.length}</strong> records with warnings
            </li>
            <li>
              <strong>{preview.parseErrors.length}</strong> parser warnings
            </li>
          </ul>

          {invalidRecords.length > 0 && (
            <details className="import-details">
              <summary>Invalid records ({invalidRecords.length})</summary>
              <ul>
                {invalidRecords.slice(0, DETAIL_LIMIT).map((record) => (
                  <li key={record.qso.id}>
                    <strong>{recordLabel(record)}:</strong>{' '}
                    {record.validation.errors.map((error) => error.message).join('; ')}
                  </li>
                ))}
              </ul>
              {invalidRecords.length > DETAIL_LIMIT && (
                <p>Showing the first {DETAIL_LIMIT} invalid records.</p>
              )}
            </details>
          )}

          {warningRecords.length > 0 && (
            <details className="import-details">
              <summary>Records requiring review ({warningRecords.length})</summary>
              <ul>
                {warningRecords.slice(0, DETAIL_LIMIT).map((record) => (
                  <li key={record.qso.id}>
                    <strong>{recordLabel(record)}:</strong>{' '}
                    {record.validation.warnings.map((warning) => warning.message).join('; ')}
                  </li>
                ))}
              </ul>
              {warningRecords.length > DETAIL_LIMIT && (
                <p>Showing the first {DETAIL_LIMIT} records with warnings.</p>
              )}
            </details>
          )}

          {preview.parseErrors.length > 0 && (
            <details className="import-details">
              <summary>Parser warnings ({preview.parseErrors.length})</summary>
              <ul>
                {preview.parseErrors.slice(0, DETAIL_LIMIT).map((error, index) => (
                  <li key={`${error.offset}-${index}`}>
                    Line {error.line}: {error.message}
                  </li>
                ))}
              </ul>
              {preview.parseErrors.length > DETAIL_LIMIT && (
                <p>Showing the first {DETAIL_LIMIT} parser warnings.</p>
              )}
            </details>
          )}

          {importPlan.added.length === 0 && (
            <p className="supporting-text" role="status">
              Nothing is ready to import. Review invalid records or duplicates above.
            </p>
          )}

          <div className="btn-row">
            {importPlan.added.length > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void confirmImport()}
              >
                {phase === 'saving'
                  ? 'Importing…'
                  : `Import ${importPlan.added.length} QSO${
                      importPlan.added.length === 1 ? '' : 's'
                    }`}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setNotice(null);
              }}
            >
              Cancel preview
            </button>
          </div>
        </section>
      )}

      <details className="backup-settings">
        <summary>Backup reminder settings</summary>
        <p className="supporting-text">
          {qsos.length === 0
            ? 'The log is empty.'
            : backupStatus.lastExportAt
              ? backupStatus.dirty
                ? 'The log has changed since the last full export.'
                : 'The full-log backup is current.'
              : 'No full-log export has been recorded on this device.'}
        </p>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="backup-qso-threshold">QSO count difference</label>
            <select
              id="backup-qso-threshold"
              value={backupSettings.qsoCountThreshold}
              onChange={(event) =>
                onBackupSettingsChange({
                  ...backupSettings,
                  qsoCountThreshold: Number(event.target.value),
                })
              }
            >
              {[5, 10, 25, 50].map((threshold) => (
                <option key={threshold} value={threshold}>
                  {threshold} QSOs
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="backup-age-threshold">Elapsed time while changed</label>
            <select
              id="backup-age-threshold"
              value={backupSettings.ageMinutesThreshold}
              onChange={(event) =>
                onBackupSettingsChange({
                  ...backupSettings,
                  ageMinutesThreshold: Number(event.target.value),
                })
              }
            >
              {[
                [15, '15 minutes'],
                [30, '30 minutes'],
                [60, '1 hour'],
                [240, '4 hours'],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </details>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => exportLog(qsos, `fieldlog-export-${Date.now()}.adi`, true)}
        >
          Export full log
        </button>
        {filteredQsos && filteredQsos.length !== qsos.length && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => exportLog(filteredQsos, `fieldlog-filtered-${Date.now()}.adi`, false)}
          >
            Export filtered ({filteredQsos.length})
          </button>
        )}
      </div>
      {notice && (
        <p
          className={notice.kind === 'success' ? 'flash-success' : 'error-banner'}
          role={notice.kind === 'success' ? 'status' : 'alert'}
          style={{ marginTop: '1rem' }}
        >
          {notice.message}
        </p>
      )}
    </section>
  );
}

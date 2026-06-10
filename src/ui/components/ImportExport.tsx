import { useRef, useState } from 'react';
import { parseAdi, serializeAdi } from '../../core/adif';
import { adifRecordToQso, qsoToAdifRecord, type Qso } from '../../core/model';
import { mergeQsos } from '../../core/dupes';

interface ImportExportProps {
  qsos: Qso[];
  filteredQsos?: Qso[];
  onImport: (added: Qso[]) => Promise<void>;
}

export function ImportExport({ qsos, filteredQsos, onImport }: ImportExportProps) {
  const [summary, setSummary] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const result = parseAdi(text);
    const incoming = result.records.map((r) => adifRecordToQso(r));
    const { added, skipped } = mergeQsos(qsos, incoming);
    if (added.length > 0) {
      await onImport(added);
    }
    const errorNote = result.errors.length > 0 ? `, ${result.errors.length} parse warning(s)` : '';
    setSummary(
      `Import complete: ${added.length} added, ${skipped.length} skipped (duplicates)${errorNote}`,
    );
  };

  const exportLog = (subset: Qso[], filename: string) => {
    const records = subset.map(qsoToAdifRecord);
    const adi = serializeAdi(records);
    const blob = new Blob([adi], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setSummary(`Exported ${subset.length} QSO(s) to ${filename}`);
  };

  return (
    <section className="panel" aria-labelledby="import-export-heading">
      <h2 id="import-export-heading">Import / Export</h2>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
      >
        Drop .adi file here or click to browse
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".adi,.adif,.txt"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Imports merge into your log with duplicate detection. Malformed records are flagged but
        never overwrite existing data.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => exportLog(qsos, `fieldlog-export-${Date.now()}.adi`)}
        >
          Export full log
        </button>
        {filteredQsos && filteredQsos.length !== qsos.length && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => exportLog(filteredQsos, `fieldlog-filtered-${Date.now()}.adi`)}
          >
            Export filtered ({filteredQsos.length})
          </button>
        )}
      </div>
      {summary && (
        <p className="flash-success" role="status" style={{ marginTop: '1rem' }}>
          {summary}
        </p>
      )}
    </section>
  );
}

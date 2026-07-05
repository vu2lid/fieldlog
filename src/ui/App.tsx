import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Qso, SessionContext } from '../core/model';
import { StorageError } from '../storage';
import * as storage from '../storage';
import {
  createBackupSnapshot,
  getBackupStatus,
  loadBackupSettings,
  loadBackupSnapshot,
  saveBackupSettings,
  saveBackupSnapshot,
  type BackupReminderSettings,
} from './backup';
import { EMPTY_LOG_FILTER, filterQsos } from './logFilter';
import { downloadQsosAsAdi } from './exportAdi';
import { BackupReminder } from './components/BackupReminder';
import { EditQsoModal } from './components/EditQsoModal';
import { EntryForm } from './components/EntryForm';
import { HelpView } from './components/HelpView';
import { ImportExport } from './components/ImportExport';
import { LogTable } from './components/LogTable';
import { SessionPanel } from './components/SessionPanel';
import { ThemeSelector } from './components/ThemeSelector';
import { UtcClock } from './components/UtcClock';
import './styles/app.css';

type Tab = 'log' | 'session' | 'import' | 'help';

export function App() {
  const [tab, setTab] = useState<Tab>('log');
  const [qsos, setQsos] = useState<Qso[]>([]);
  const [session, setSession] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [persistWarning, setPersistWarning] = useState(false);
  const [editing, setEditing] = useState<Qso | null>(null);
  const [logFilter, setLogFilter] = useState(EMPTY_LOG_FILTER);
  const [backupSettings, setBackupSettings] = useState(loadBackupSettings);
  const [backupSnapshot, setBackupSnapshot] = useState(loadBackupSnapshot);
  const [backupNow, setBackupNow] = useState(Date.now);
  const [dismissedBackupFingerprint, setDismissedBackupFingerprint] = useState<string | null>(null);

  const filteredQsos = useMemo(() => filterQsos(qsos, logFilter), [qsos, logFilter]);
  const backupStatus = useMemo(
    () => getBackupStatus(qsos, backupSnapshot, backupSettings, backupNow),
    [qsos, backupSnapshot, backupSettings, backupNow],
  );

  useEffect(() => {
    void (async () => {
      try {
        const [loadedQsos, loadedSession] = await Promise.all([
          storage.getAllQsos(),
          storage.getSession(),
        ]);
        setQsos(loadedQsos.sort((a, b) => b.createdAt - a.createdAt));
        setSession(loadedSession);
      } catch (e) {
        const msg = e instanceof StorageError ? e.message : 'Failed to load data';
        setError(msg);
      } finally {
        setLoading(false);
      }
      if ((await storage.requestPersistence()) === 'denied') {
        setPersistWarning(true);
      }
    })();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setBackupNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const persistSession = useCallback(async (next: SessionContext) => {
    setSession(next);
    try {
      await storage.saveSession(next);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Failed to save session');
    }
  }, []);

  const handleLog = useCallback(async (qso: Qso) => {
    try {
      await storage.putQso(qso);
      setQsos((prev) => [qso, ...prev]);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Failed to save QSO');
      throw e;
    }
  }, []);

  const handleImport = useCallback(async (added: Qso[]) => {
    try {
      await storage.putQsos(added);
      setQsos((prev) => [...added, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Failed to import QSOs');
      throw e;
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await storage.deleteQso(id);
      setQsos((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Failed to delete QSO');
    }
  }, []);

  const handleSaveEdit = useCallback(async (qso: Qso) => {
    try {
      await storage.putQso(qso);
      setQsos((prev) => prev.map((q) => (q.id === qso.id ? qso : q)));
      setEditing(null);
    } catch (e) {
      setError(e instanceof StorageError ? e.message : 'Failed to update QSO');
      throw e;
    }
  }, []);

  const recordFullExport = useCallback(
    (exportedAt = Date.now()) => {
      const snapshot = createBackupSnapshot(qsos, exportedAt);
      saveBackupSnapshot(snapshot);
      setBackupSnapshot(snapshot);
      setBackupNow(exportedAt);
      setDismissedBackupFingerprint(null);
    },
    [qsos],
  );

  const handleBackupSettingsChange = useCallback((next: BackupReminderSettings) => {
    saveBackupSettings(next);
    setBackupSettings(next);
    setBackupNow(Date.now());
  }, []);

  const exportBackupNow = useCallback(() => {
    try {
      const exportedAt = Date.now();
      downloadQsosAsAdi(qsos, `fieldlog-export-${exportedAt}.adi`);
      recordFullExport(exportedAt);
    } catch {
      setError('Failed to prepare ADIF backup');
    }
  }, [qsos, recordFullExport]);

  if (loading || !session) {
    return (
      <div className="app">
        <p>Loading FieldLog…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <span>Field</span>Log
        </h1>
        <UtcClock />
        <ThemeSelector />
        <nav className="nav-tabs" aria-label="Main navigation">
          {(
            [
              ['log', 'Log'],
              ['session', 'Session'],
              ['import', 'Import/Export'],
              ['help', 'Help'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="nav-tab"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: '1rem' }}
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}

      {persistWarning && (
        <div className="error-banner" role="status">
          Persistent storage was not granted — the browser may evict log data under storage
          pressure. Export your log regularly, or install the app to improve persistence.
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: '1rem' }}
            onClick={() => setPersistWarning(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      {tab === 'log' && (
        <>
          {backupStatus.recommended && backupStatus.fingerprint !== dismissedBackupFingerprint && (
            <BackupReminder
              status={backupStatus}
              onExport={exportBackupNow}
              onDismiss={() => setDismissedBackupFingerprint(backupStatus.fingerprint)}
            />
          )}
          <EntryForm
            session={session}
            qsos={qsos}
            onLog={handleLog}
            onSessionChange={persistSession}
          />
          <LogTable
            qsos={qsos}
            filteredQsos={filteredQsos}
            filter={logFilter}
            onFilterChange={setLogFilter}
            onEdit={setEditing}
            onDelete={(id) => void handleDelete(id)}
          />
        </>
      )}
      {tab === 'session' && (
        <SessionPanel
          session={session}
          sessionQsoCount={qsos.filter((q) => q.createdAt >= session.sessionStartedAt).length}
          totalQsoCount={qsos.length}
          onChange={(s) => void persistSession(s)}
        />
      )}
      {tab === 'import' && (
        <ImportExport
          qsos={qsos}
          filteredQsos={filteredQsos}
          backupSettings={backupSettings}
          backupStatus={backupStatus}
          onBackupSettingsChange={handleBackupSettingsChange}
          onFullExport={recordFullExport}
          onImport={handleImport}
        />
      )}
      {tab === 'help' && <HelpView />}

      {editing && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 99,
            }}
            onClick={() => setEditing(null)}
            aria-hidden="true"
          />
          <EditQsoModal qso={editing} onSave={handleSaveEdit} onClose={() => setEditing(null)} />
        </>
      )}
    </div>
  );
}

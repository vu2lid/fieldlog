import type { BackupStatus } from '../backup';

interface BackupReminderProps {
  status: BackupStatus;
  onExport: () => void;
  onDismiss: () => void;
}

export function BackupReminder({ status, onExport, onDismiss }: BackupReminderProps) {
  const reasons: string[] = [];
  if (status.countThresholdReached) {
    reasons.push(`${status.qsoCountDelta} QSO${status.qsoCountDelta === 1 ? '' : 's'} difference`);
  }
  if (status.ageThresholdReached) {
    reasons.push(`${status.ageMinutes} minutes since the backup baseline`);
  }

  return (
    <div className="backup-reminder" role="status">
      <div>
        <strong>Full-log backup recommended.</strong>{' '}
        {status.lastExportAt
          ? `The log changed since the last full export (${reasons.join(', ')}).`
          : `No full export has been recorded (${reasons.join(', ')}).`}
      </div>
      <div className="backup-reminder-actions">
        <button type="button" className="btn btn-primary" onClick={onExport}>
          Export backup now
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDismiss}>
          Dismiss until log changes
        </button>
      </div>
    </div>
  );
}

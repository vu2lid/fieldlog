// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BackupStatus } from '../backup';
import { BackupReminder } from './BackupReminder';

afterEach(() => {
  cleanup();
});

describe('BackupReminder', () => {
  it('explains the trigger and exposes non-blocking actions', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    const onDismiss = vi.fn();
    const status: BackupStatus = {
      fingerprint: 'fingerprint',
      dirty: true,
      recommended: true,
      qsoCountDelta: 10,
      ageMinutes: 35,
      countThresholdReached: true,
      ageThresholdReached: true,
      lastExportAt: 1,
    };
    render(<BackupReminder status={status} onExport={onExport} onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent('10 QSOs difference');
    expect(screen.getByRole('status')).toHaveTextContent('35 minutes');
    await user.click(screen.getByRole('button', { name: 'Export backup now' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss until log changes' }));
    expect(onExport).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

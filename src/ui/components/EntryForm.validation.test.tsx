// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION } from '../../core/model';
import { EntryForm } from './EntryForm';

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
});

function renderEntryForm(onLog = vi.fn().mockResolvedValue(undefined)) {
  render(<EntryForm session={DEFAULT_SESSION} qsos={[]} onLog={onLog} onSessionChange={vi.fn()} />);
  return onLog;
}

describe('EntryForm validation', () => {
  it('blocks invalid fields, retains the draft, and focuses the first error', async () => {
    const user = userEvent.setup();
    const onLog = renderEntryForm();

    await user.type(screen.getByLabelText('Callsign *'), 'W1AW');
    await user.clear(screen.getByLabelText('QSO date (UTC)'));
    await user.type(screen.getByLabelText('QSO date (UTC)'), '20230229');
    await user.clear(screen.getByLabelText('Time on (UTC)'));
    await user.type(screen.getByLabelText('Time on (UTC)'), '240000');
    await user.clear(screen.getByLabelText('Frequency (MHz)'));
    await user.type(screen.getByLabelText('Frequency (MHz)'), '0');
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));

    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Fix 3 errors before logging');
    expect(screen.getByText(/QSO date must be a real date/)).toBeInTheDocument();
    expect(screen.getByText(/Time on must be HHMM or HHMMSS/)).toBeInTheDocument();
    expect(screen.getByText(/Frequency must be a positive number/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('QSO date (UTC)')).toHaveFocus());
    expect(screen.getByLabelText('Callsign *')).toHaveValue('W1AW');
  });

  it('requires explicit confirmation for a warning and then logs unchanged data', async () => {
    const user = userEvent.setup();
    const onLog = renderEntryForm();

    await user.type(screen.getByLabelText('Callsign *'), 'W1AW');
    await user.type(screen.getByLabelText('Grid'), 'NOT-A-GRID');
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));

    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Review 1 warning');
    expect(screen.getByText(/not a recognized.*Maidenhead locator/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log anyway (Enter)' }));

    await waitFor(() => expect(onLog).toHaveBeenCalledTimes(1));
    expect(onLog.mock.calls[0]![0]).toMatchObject({
      call: 'W1AW',
      gridSquare: 'NOT-A-GRID',
    });
    expect(screen.getByText('Logged W1AW')).toBeInTheDocument();
  });

  it('clears stale warning confirmation when the draft changes', async () => {
    const user = userEvent.setup();
    const onLog = renderEntryForm();

    await user.type(screen.getByLabelText('Callsign *'), 'W1AW');
    await user.type(screen.getByLabelText('Grid'), 'INVALID');
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));
    expect(screen.getByRole('button', { name: 'Log anyway (Enter)' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Grid'));
    await user.type(screen.getByLabelText('Grid'), 'FN31PR');

    expect(screen.getByRole('button', { name: 'Log QSO (Enter)' })).toBeInTheDocument();
    expect(screen.queryByText(/Review 1 warning/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));
    await waitFor(() => expect(onLog).toHaveBeenCalledTimes(1));
  });

  it('logs valid data in one step and trims the callsign', async () => {
    const user = userEvent.setup();
    const onLog = renderEntryForm();

    await user.type(screen.getByLabelText('Callsign *'), ' w1aw ');
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));

    await waitFor(() => expect(onLog).toHaveBeenCalledTimes(1));
    expect(onLog.mock.calls[0]![0]).toMatchObject({ call: 'W1AW' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

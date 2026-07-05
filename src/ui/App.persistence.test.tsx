// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SESSION } from '../core/model';
import * as storage from '../storage';
import { App } from './App';
import { EntryForm } from './components/EntryForm';

vi.mock('../storage', async () => {
  const actual = await vi.importActual<typeof import('../storage')>('../storage');
  return {
    ...actual,
    getAllQsos: vi.fn(),
    getSession: vi.fn(),
    putQso: vi.fn(),
    putQsos: vi.fn(),
    requestPersistence: vi.fn(),
    saveSession: vi.fn(),
  };
});

beforeEach(() => {
  localStorage.clear();
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
  vi.mocked(storage.getAllQsos).mockResolvedValue([]);
  vi.mocked(storage.getSession).mockResolvedValue(DEFAULT_SESSION);
  vi.mocked(storage.requestPersistence).mockResolvedValue('granted');
  vi.mocked(storage.saveSession).mockResolvedValue();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('persistence failures', () => {
  it('explains denied persistence without claiming installation guarantees it', async () => {
    vi.mocked(storage.requestPersistence).mockResolvedValue('denied');
    render(<App />);

    const warning = await screen.findByRole('status');
    expect(warning).toHaveTextContent('Your log is stored locally');
    expect(warning).toHaveTextContent('Export your log regularly');
    expect(warning).not.toHaveTextContent('install the app');
  });

  it('retains the QSO draft and does not report success when saving fails', async () => {
    vi.mocked(storage.putQso).mockRejectedValue(new storage.StorageError('Database unavailable'));
    const user = userEvent.setup();
    render(<App />);

    const call = await screen.findByLabelText('Callsign *');
    await user.type(call, 'W1AW');
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Database unavailable');
    expect(call).toHaveValue('W1AW');
    expect(screen.queryByText('Logged W1AW')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log QSO (Enter)' })).toBeEnabled();
  });

  it('reports a failed import without claiming records were added', async () => {
    vi.mocked(storage.putQsos).mockRejectedValue(new storage.StorageError('Import write failed'));
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(
      await screen.findByRole('button', {
        name: 'Import/Export',
      }),
    );
    const file = new File(
      ['<CALL:4>W1AW<QSO_DATE:8>20240101<TIME_ON:6>120000<BAND:3>20m<MODE:3>SSB<EOR>'],
      'log.adi',
      { type: 'text/plain' },
    );
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    await user.upload(input!, file);
    await user.click(await screen.findByRole('button', { name: 'Import 1 QSO' }));

    expect(await screen.findByText('Import write failed')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Import failed — no QSOs were added. Review the error and retry this preview.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Import complete/)).not.toBeInTheDocument();
  });

  it('keeps the edit dialog and draft open when an update fails', async () => {
    vi.mocked(storage.getAllQsos).mockResolvedValue([
      {
        id: 'qso-1',
        call: 'W1AW',
        qsoDate: '20240229',
        timeOn: '120000',
        band: '20m',
        freq: 14.2,
        mode: 'SSB',
        rstSent: '59',
        rstRcvd: '59',
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    vi.mocked(storage.putQso).mockRejectedValue(new storage.StorageError('Update write failed'));
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('checkbox', { name: 'Highlights' }));
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Call'));
    await user.type(screen.getByLabelText('Call'), 'K1ABC');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Update write failed')).toBeInTheDocument();
    expect(await screen.findByText(/QSO could not be saved/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Call')).toHaveValue('K1ABC');
  });
});

describe('pending QSO saves', () => {
  it('prevents a second submission while the first save is pending', async () => {
    let resolveSave: (() => void) | undefined;
    const onLog = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const user = userEvent.setup();
    render(
      <EntryForm session={DEFAULT_SESSION} qsos={[]} onLog={onLog} onSessionChange={vi.fn()} />,
    );

    await user.type(screen.getByLabelText('Callsign *'), 'W1AW');
    await user.click(screen.getByRole('button', { name: 'Log QSO (Enter)' }));

    const savingButton = screen.getByRole('button', { name: 'Saving…' });
    expect(savingButton).toBeDisabled();
    await user.click(savingButton);
    expect(onLog).toHaveBeenCalledTimes(1);

    resolveSave?.();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Log QSO (Enter)' })).toBeEnabled(),
    );
    expect(screen.getByText('Logged W1AW')).toBeInTheDocument();
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Qso } from '../../core/model';
import { DEFAULT_BACKUP_SETTINGS, getBackupStatus } from '../backup';
import { ImportExport } from './ImportExport';

function makeQso(overrides: Partial<Qso> = {}): Qso {
  return {
    id: 'existing',
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
    ...overrides,
  };
}

function adifRecord(fields: Record<string, string>): string {
  return (
    Object.entries(fields)
      .map(([name, value]) => `<${name}:${new TextEncoder().encode(value).length}>${value}`)
      .join('') + '<EOR>\n'
  );
}

function validFields(call: string): Record<string, string> {
  return {
    CALL: call,
    QSO_DATE: '20240229',
    TIME_ON: '120000',
    BAND: '20m',
    FREQ: '14.2',
    MODE: 'SSB',
  };
}

function importFile(content: string): File {
  return new File([content], 'mixed.adi', { type: 'text/plain' });
}

function backupProps(qsos: Qso[]) {
  return {
    backupSettings: DEFAULT_BACKUP_SETTINGS,
    backupStatus: getBackupStatus(qsos, null, DEFAULT_BACKUP_SETTINGS, 0),
    onBackupSettingsChange: vi.fn(),
    onFullExport: vi.fn(),
  };
}

afterEach(() => {
  cleanup();
});

describe('ImportExport preview', () => {
  it('classifies mixed records and writes only confirmed valid non-duplicates', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockResolvedValue(undefined);
    const content = [
      adifRecord(validFields('W1AW')),
      adifRecord(validFields('K1ABC')),
      adifRecord({
        CALL: 'N0BAD',
        TIME_ON: '120000',
        BAND: '20m',
        FREQ: '14.2',
        MODE: 'SSB',
      }),
      adifRecord(validFields('K1-ABC')),
    ].join('');
    const { container } = render(
      <ImportExport
        qsos={[makeQso()]}
        filteredQsos={[makeQso()]}
        onImport={onImport}
        {...backupProps([makeQso()])}
      />,
    );

    await user.upload(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      importFile(content),
    );

    const counts = await screen.findByLabelText('Import preview counts');
    expect(counts).toHaveTextContent('4 records found');
    expect(counts).toHaveTextContent('2 ready to import');
    expect(counts).toHaveTextContent('1 duplicates skipped');
    expect(counts).toHaveTextContent('1 invalid excluded');
    expect(counts).toHaveTextContent('1 records with warnings');
    expect(onImport).not.toHaveBeenCalled();

    await user.click(screen.getByText('Invalid records (1)'));
    expect(screen.getByText(/QSO date is required/)).toBeInTheDocument();
    await user.click(screen.getByText('Records requiring review (1)'));
    expect(screen.getByText(/Callsign contains unusual characters/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import 2 QSOs' }));

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(onImport.mock.calls[0]![0].map((qso: Qso) => qso.call)).toEqual(['K1ABC', 'K1-ABC']);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Import complete: 2 added, 1 skipped (duplicates), 1 invalid excluded',
    );
  });

  it('shows parser warnings and performs no write before confirmation', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockResolvedValue(undefined);
    const content = 'ADIF Export\n<PROGRAMID>NO_LENGTH\n<EOH>\n' + adifRecord(validFields('K1ABC'));
    const { container } = render(
      <ImportExport qsos={[]} filteredQsos={[]} onImport={onImport} {...backupProps([])} />,
    );

    await user.upload(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      importFile(content),
    );

    const counts = await screen.findByLabelText('Import preview counts');
    expect(counts).toHaveTextContent('1 ready to import');
    expect(counts).toHaveTextContent(/\d+ parser warnings/);
    expect(onImport).not.toHaveBeenCalled();
    await user.click(screen.getByText(/Parser warnings \(\d+\)/));
    expect(screen.getByText(/Malformed field/)).toBeInTheDocument();
  });

  it('cancels a preview without importing', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ImportExport qsos={[]} filteredQsos={[]} onImport={onImport} {...backupProps([])} />,
    );

    await user.upload(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      importFile(adifRecord(validFields('K1ABC'))),
    );
    await screen.findByRole('heading', { name: /Import preview/ });
    await user.click(screen.getByRole('button', { name: 'Cancel preview' }));

    expect(screen.queryByRole('heading', { name: /Import preview/ })).not.toBeInTheDocument();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('retains the preview after a failed write and allows retry', async () => {
    const user = userEvent.setup();
    const onImport = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage failed'))
      .mockResolvedValueOnce(undefined);
    const { container } = render(
      <ImportExport qsos={[]} filteredQsos={[]} onImport={onImport} {...backupProps([])} />,
    );

    await user.upload(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      importFile(adifRecord(validFields('K1ABC'))),
    );
    await user.click(await screen.findByRole('button', { name: 'Import 1 QSO' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed');
    expect(screen.getByRole('heading', { name: /Import preview/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Import 1 QSO' }));
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('status')).toHaveTextContent('Import complete: 1 added');
  });

  it('reports when a preview contains only duplicates', async () => {
    const user = userEvent.setup();
    const existing = makeQso();
    const { container } = render(
      <ImportExport
        qsos={[existing]}
        filteredQsos={[existing]}
        onImport={vi.fn()}
        {...backupProps([existing])}
      />,
    );

    await user.upload(
      container.querySelector<HTMLInputElement>('input[type="file"]')!,
      importFile(adifRecord(validFields('W1AW'))),
    );

    const preview = await screen.findByRole('region', { name: /Import preview/ });
    expect(within(preview).getByText(/Nothing is ready to import/)).toBeInTheDocument();
    expect(within(preview).queryByRole('button', { name: /Import \d/ })).not.toBeInTheDocument();
  });
});

describe('ImportExport backup controls', () => {
  it('records only full exports as backup snapshots', async () => {
    const user = userEvent.setup();
    const first = makeQso();
    const second = makeQso({ id: 'second', call: 'K1ABC' });
    const onFullExport = vi.fn();
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fieldlog-test');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const props = backupProps([first, second]);
    render(
      <ImportExport
        qsos={[first, second]}
        filteredQsos={[first]}
        onImport={vi.fn()}
        {...props}
        onFullExport={onFullExport}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export filtered (1)' }));
    expect(onFullExport).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Export full log' }));
    expect(onFullExport).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);

    await waitFor(() => expect(revokeObjectUrl).toHaveBeenCalledTimes(2));
    createObjectUrl.mockRestore();
    revokeObjectUrl.mockRestore();
    click.mockRestore();
  });

  it('reports reminder setting changes', async () => {
    const user = userEvent.setup();
    const onBackupSettingsChange = vi.fn();
    render(
      <ImportExport
        qsos={[]}
        filteredQsos={[]}
        onImport={vi.fn()}
        {...backupProps([])}
        onBackupSettingsChange={onBackupSettingsChange}
      />,
    );

    await user.click(screen.getByText('Backup reminder settings'));
    await user.selectOptions(screen.getByLabelText('QSO count difference'), '25');
    expect(onBackupSettingsChange).toHaveBeenCalledWith({
      qsoCountThreshold: 25,
      ageMinutesThreshold: 30,
    });
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Qso } from '../../core/model';
import { EditQsoModal } from './EditQsoModal';

function makeQso(overrides: Partial<Qso> = {}): Qso {
  return {
    id: 'qso-1',
    call: 'W1AW',
    qsoDate: '20240229',
    timeOn: '120000',
    band: '20m',
    freq: 14.2,
    mode: 'SSB',
    rstSent: '59',
    rstRcvd: '59',
    extraFields: { CUSTOM_FIELD: 'PRESERVE-ME' },
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

function renderModal(onSave = vi.fn().mockResolvedValue(undefined), qso: Qso = makeQso()) {
  render(<EditQsoModal qso={qso} onSave={onSave} onClose={vi.fn()} />);
  return onSave;
}

describe('EditQsoModal', () => {
  it('edits known fields across groups while preserving unknown ADIF fields', async () => {
    const user = userEvent.setup();
    const onSave = renderModal();

    await user.clear(screen.getByLabelText('Time off (UTC)'));
    await user.type(screen.getByLabelText('Time off (UTC)'), '121500');
    await user.type(screen.getByLabelText('Submode'), 'usb');

    await user.click(screen.getByText('Contact and station fields'));
    await user.type(screen.getByLabelText('Name'), 'Hiram');
    await user.type(screen.getByLabelText('QTH'), 'Newington');
    await user.type(screen.getByLabelText('Their grid'), 'FN31PR');
    await user.type(screen.getByLabelText('Station callsign'), 'k0test');
    await user.type(screen.getByLabelText('Operator'), 'k0test');
    await user.type(screen.getByLabelText('My grid'), 'EM10AA');
    await user.type(screen.getByLabelText('TX power'), '10');
    await user.type(screen.getByLabelText('Comment'), 'Edited contact');

    await user.click(screen.getByText('Program, signal, and contest fields'));
    await user.type(screen.getByLabelText('Their POTA ref'), 'us-ca-0123');
    await user.type(screen.getByLabelText('My POTA ref'), 'us-tx-0001');
    await user.type(screen.getByLabelText('Contest ID'), 'field-day');
    await user.type(screen.getByLabelText('Sent exchange'), '1A TX');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]![0]).toMatchObject({
      id: 'qso-1',
      call: 'W1AW',
      timeOff: '121500',
      submode: 'USB',
      name: 'Hiram',
      qth: 'Newington',
      gridSquare: 'FN31PR',
      stationCallsign: 'K0TEST',
      operator: 'K0TEST',
      myGridSquare: 'EM10AA',
      txPwr: '10',
      comment: 'Edited contact',
      potaRef: 'US-CA-0123',
      myPotaRef: 'US-TX-0001',
      contestId: 'FIELD-DAY',
      stxString: '1A TX',
      extraFields: { CUSTOM_FIELD: 'PRESERVE-ME' },
      createdAt: 100,
    });
  });

  it('blocks invalid edits, retains values, and focuses the first error', async () => {
    const user = userEvent.setup();
    const onSave = renderModal();

    await user.clear(screen.getByLabelText('Date (UTC)'));
    await user.type(screen.getByLabelText('Date (UTC)'), '20230229');
    await user.clear(screen.getByLabelText('Frequency (MHz)'));
    await user.type(screen.getByLabelText('Frequency (MHz)'), '0');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Fix 2 errors before saving');
    expect(screen.getByText(/QSO date must be a real date/)).toBeInTheDocument();
    expect(screen.getByText(/Frequency must be a positive number/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Date (UTC)')).toHaveFocus());
    expect(screen.getByLabelText('Frequency (MHz)')).toHaveValue(0);
  });

  it('opens the relevant group and requires confirmation for warnings', async () => {
    const user = userEvent.setup();
    const onSave = renderModal();

    await user.click(screen.getByText('Contact and station fields'));
    await user.type(screen.getByLabelText('Their grid'), 'INVALID');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Review 1 warning');
    expect(screen.getByLabelText('Their grid')).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Save anyway' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0]![0]).toMatchObject({ gridSquare: 'INVALID' });
  });

  it('retains edits and allows retry after a failed save', async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('storage failed'))
      .mockResolvedValueOnce(undefined);
    renderModal(onSave);

    await user.click(screen.getByText('Contact and station fields'));
    await user.type(screen.getByLabelText('Name'), 'Hiram');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('QSO could not be saved');
    expect(screen.getByLabelText('Name')).toHaveValue('Hiram');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
  });

  it('prevents duplicate saves while persistence is pending', async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const user = userEvent.setup();
    renderModal(onSave);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    const savingButton = screen.getByRole('button', { name: 'Saving…' });
    expect(savingButton).toBeDisabled();
    await user.click(savingButton);
    expect(onSave).toHaveBeenCalledTimes(1);

    resolveSave?.();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled());
  });
});

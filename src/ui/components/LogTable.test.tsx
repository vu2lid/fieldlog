// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Qso } from '../../core/model';
import { EMPTY_LOG_FILTER } from '../logFilter';
import { LogTable } from './LogTable';

const qso: Qso = {
  id: 'qso-1',
  call: 'W1AW',
  qsoDate: '20240601',
  timeOn: '120000',
  band: '20m',
  freq: 14.2,
  mode: 'SSB',
  rstSent: '59',
  rstRcvd: '59',
  createdAt: 0,
  updatedAt: 0,
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('LogTable Highlights view', () => {
  it('shows Date and hides Actions by default', () => {
    render(
      <LogTable
        qsos={[qso]}
        filteredQsos={[qso]}
        filter={EMPTY_LOG_FILTER}
        onFilterChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: /Date/ })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '20240601' })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('restores Actions when Highlights is unchecked', async () => {
    const user = userEvent.setup();
    render(
      <LogTable
        qsos={[qso]}
        filteredQsos={[qso]}
        filter={EMPTY_LOG_FILTER}
        onFilterChange={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: 'Highlights' }));

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(localStorage.getItem('fieldlog-log-columns')).toBe('all');
  });
});

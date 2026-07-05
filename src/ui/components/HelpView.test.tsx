// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { APP_VERSION } from '../../core/version';
import { HelpView } from './HelpView';

afterEach(() => {
  cleanup();
});

describe('HelpView', () => {
  it('shows the application version from package metadata', () => {
    render(<HelpView />);

    expect(screen.getByText(`FieldLog v${APP_VERSION}`)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Install FieldLog' })).toBeInTheDocument();
    expect(screen.getByText(/install icon in the address bar/i)).toBeInTheDocument();
    expect(screen.getByText(/Export your log before uninstalling/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Uninstalling may leave the log in browser storage/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/This cannot be undone/i)).toBeInTheDocument();
  });
});

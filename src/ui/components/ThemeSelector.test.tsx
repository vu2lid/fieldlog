// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeSelector } from './ThemeSelector';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  cleanup();
});

describe('ThemeSelector', () => {
  it('loads the saved theme and offers all three choices', () => {
    localStorage.setItem('fieldlog-theme', 'light');
    render(<ThemeSelector />);

    const selector = screen.getByRole('combobox', { name: 'Theme' });
    expect(selector).toHaveValue('light');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Light',
      'Dark',
      'Red Night',
    ]);
  });

  it('applies and persists a selected theme', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Theme' }), 'red');

    expect(document.documentElement).toHaveAttribute('data-theme', 'red');
    expect(localStorage.getItem('fieldlog-theme')).toBe('red');
  });
});

// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTheme, loadTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('theme preferences', () => {
  it.each(['light', 'dark', 'red'] as const)('loads the persisted %s theme', (theme) => {
    localStorage.setItem('fieldlog-theme', theme);
    expect(loadTheme()).toBe(theme);
  });

  it('falls back to dark for a missing or unsupported preference', () => {
    expect(loadTheme()).toBe('dark');
    localStorage.setItem('fieldlog-theme', 'unknown');
    expect(loadTheme()).toBe('dark');
  });

  it('applies and persists a theme', () => {
    applyTheme('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('fieldlog-theme')).toBe('light');
  });
});

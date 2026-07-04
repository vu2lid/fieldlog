export type Theme = 'dark' | 'red';

const STORAGE_KEY = 'fieldlog-theme';

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'red' ? 'red' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (e.g. private mode); theme still applies for this visit.
  }
}

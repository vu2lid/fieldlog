import { useEffect, useState } from 'react';
import { applyTheme, loadTheme, type Theme } from '../theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="btn btn-secondary"
      aria-pressed={theme === 'red'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'red' : 'dark'))}
    >
      {theme === 'red' ? 'Dark theme' : 'Red night mode'}
    </button>
  );
}

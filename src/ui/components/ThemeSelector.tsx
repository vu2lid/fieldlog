import { useState } from 'react';
import { applyTheme, loadTheme, type Theme } from '../theme';

export function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  const selectTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <label className="theme-selector">
      <span>Theme</span>
      <select
        aria-label="Theme"
        value={theme}
        onChange={(event) => selectTheme(event.target.value as Theme)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="red">Red Night</option>
      </select>
    </label>
  );
}

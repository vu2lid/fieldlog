// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstallButton } from './InstallButton';

function mockDisplayMode(standalone: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: standalone,
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function dispatchInstallAvailable() {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt,
    userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });
  act(() => window.dispatchEvent(event));
  return prompt;
}

beforeEach(() => {
  mockDisplayMode(false);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InstallButton', () => {
  it('offers installation only after the browser reports that it is available', async () => {
    const user = userEvent.setup();
    render(<InstallButton />);

    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
    const prompt = dispatchInstallAvailable();

    await user.click(screen.getByRole('button', { name: 'Install app' }));

    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });

  it('does not offer installation inside an installed app', () => {
    mockDisplayMode(true);
    render(<InstallButton />);

    dispatchInstallAvailable();

    expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  });
});

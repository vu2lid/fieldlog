# FieldLog

Offline, browser-based amateur radio field logger for POTA, SOTA, contests, and portable operation. Log QSOs fast, import/export ADIF, and keep all data on your device.

## Features

- **Fully offline** after first load — no server, no accounts, no cloud sync
- **ADIF 3.1.7 export** with import support back to ADIF 1.x
- **Keyboard-friendly** QSO entry (Enter to log, tab order optimized)
- **POTA/SOTA** session context and park-to-park fields
- **Duplicate detection** (same band+mode or any band)
- **IndexedDB** persistence across reloads
- **PWA** — installable, works offline via service worker
- **Strict CSP** — no external network requests at runtime

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build & serve offline

```bash
npm run build
npm run preview
```

Serve the `dist/` folder from any static host. After one online load, the service worker caches the full app shell.

## Test & lint

```bash
npm test              # unit tests (Vitest)
npm run test:coverage # coverage report (core modules)
npm run test:e2e      # Playwright end-to-end
npm run lint          # ESLint
npm run format        # Prettier
```

## Usage

1. **Session** — set station callsign, operator, grid, POTA/SOTA refs.
2. **Log** — enter callsign, RST, optional name/grid/comment; band & mode persist.
3. **Import/Export** — merge `.adi` files with deduplication; export ADIF for LoTW/Club Log/POTA upload later.
4. **Help** — in-app documentation and keyboard shortcuts.

## Privacy & offline guarantees

- All log data stays in your browser (IndexedDB).
- The running app makes **no external network requests** — no CDNs, fonts, analytics, or callsign lookups.
- A strict Content-Security-Policy is enforced via HTML meta tag and dev/preview server headers:

  ```
  default-src 'self'; connect-src 'self'; ...
  ```

### Verify no external requests

1. Load the app and open DevTools → Network.
2. Use the app normally (log, import, export, navigate tabs).
3. Confirm no requests except same-origin document/assets (and `connect-src 'self'` only for the service worker scope).
4. Disable network (offline mode) and reload — the app must remain fully usable after the first cache.

## Project structure

```
src/
  core/       # Pure domain logic (ADIF, model, bands, dupes) — no DOM
  storage/    # IndexedDB layer
  ui/         # React UI
fixtures/     # Sample .adi files for tests
```

## License

MIT — see [LICENSE](LICENSE).

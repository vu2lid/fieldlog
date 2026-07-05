# FieldLog

Offline, browser-based amateur radio field logger for POTA, SOTA, contests, and portable operation. Log QSOs fast, import/export ADIF, and keep all data on your device.

FieldLog is currently beta software. Export regular ADIF backups and include the version shown in
Help when reporting a problem.

## Features

- **Fully offline** after first load — no server, no accounts, no cloud sync
- **ADIF 3.1.7 export** with import support back to ADIF 1.x
- **Keyboard-friendly** QSO entry (Enter to log, tab order optimized)
- **POTA/SOTA** session context, park-to-park fields, and a per-session QSO counter
- **Duplicate detection** (same band+mode or any band)
- **Filterable log** — search by callsign, filter by band, mode, and date range; export the
  full log or the filtered subset
- **Highlights view** — the log table defaults to the key columns (Call, Date, Time, Band, Mode)
  so it fits phone screens without sideways scrolling; one checkbox restores the full table and
  Edit/Delete actions
- **Phone-first entry form** — primary fields and the Log button fit on screen without
  scrolling; secondary fields (name, grid, P2P refs, comment) sit in a collapsible
  "More fields" section
- **Field themes** — Light for daylight, Dark for low light, and Red Night to preserve night vision
- **Backup freshness reminders** — configurable QSO-count or elapsed-time prompts with one-click
  full ADIF export
- **IndexedDB** persistence across reloads, with persistent-storage request and quota warnings
- **PWA** — installable from an in-app button or browser controls; works offline via service worker
- **Strict CSP** — no external network requests at runtime
- Works over plain HTTP on a LAN (e.g. serving `dist/` from a laptop to a phone in the field)

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:5173>

Requires Node 24 LTS (see `.nvmrc`).

## Build & serve offline

```bash
npm run build
npm run preview
```

Serve the `dist/` folder from any static host. After one online load, the service worker caches the full app shell.

For field use you can serve `dist/` over plain HTTP on a LAN (e.g. from a laptop to a
phone). QSO ID generation falls back to a `crypto.getRandomValues`-based UUID when
`crypto.randomUUID` is unavailable outside secure contexts, so logging works there too.
Note that service-worker installation (offline caching) still requires HTTPS or
localhost — on plain HTTP the app works while the page is open but is not installable.

### Install and remove

Use FieldLog's **Install app** button or the browser's install control to add it to the
device. To remove it, choose **Uninstall FieldLog** from the installed app's menu or use
the browser or operating-system app settings. Export the log before uninstalling.

Uninstalling may leave the locally stored log in browser storage. Permanently deleting
the log is a separate action: clear FieldLog's site data in browser settings. This cannot
be undone.

## GitHub Pages deployment

The Pages workflow verifies and deploys every push to `main`. In the repository settings,
select **Settings → Pages → Source → GitHub Actions**. The workflow derives `BASE_PATH`
from the repository name, so forks and renamed repositories deploy under their own
`/<repository>/` path without source changes. The generated `dist/` directory is uploaded
as a Pages artifact and is never committed.

Local development and normal production builds use `/`. To test a project-site path locally:

```bash
BASE_PATH=/fieldlog/ npm run test:e2e
```

## Test & lint

```bash
npm test              # unit tests (Vitest)
npm run test:coverage # coverage report (core modules)
npm run test:e2e      # Playwright end-to-end
npm run lint          # ESLint
npm run format        # Prettier
```

## Usage

1. **Session** — set station callsign, operator, grid, POTA/SOTA refs. The session QSO
   counter tracks the current activation; press **New session** to reset it (the log is kept).
2. **Log** — enter callsign, RST, optional name/grid/comment; band & mode persist. On
   phones the optional fields start collapsed under **More fields** so the Log button
   stays reachable without scrolling. Invalid required values are blocked; unusual but
   potentially valid values can be reviewed and logged explicitly. The log table filters by
   callsign, band, mode, and date range; the **Highlights** checkbox (on by default, remembered
   per device) limits columns to Call/Date/Time/Band/Mode so the table fits phone screens —
   uncheck it for the full table and Edit/Delete actions. The grouped editor covers all known
   ADIF fields while preserving unknown imported fields.
3. **Import/Export** — preview `.adi` files before writing; invalid records are excluded and
   duplicates skipped. Confirmed valid records merge atomically. Export the full log or the
   currently filtered subset as ADIF for LoTW/Club Log/POTA upload later. Full exports update the
   persisted backup-freshness status; filtered exports do not.
4. **Help** — in-app documentation and keyboard shortcuts.
5. **Themes** — choose Light, Dark, or Red Night in the header; the choice persists on this device.

If the browser denies persistent storage, FieldLog shows a warning — your log then lives in
best-effort storage that the browser could evict under pressure, so export regularly.

## Privacy & offline guarantees

- All log data stays in your browser (IndexedDB).
- The running app makes **no external network requests** — no CDNs, fonts, analytics, or callsign lookups.
- A strict Content-Security-Policy is enforced via an HTML meta tag injected into the
  production build (so it holds on any static host) and via preview server headers:

  ```text
  default-src 'self'; connect-src 'self'; ...
  ```

  The dev server alone allows inline scripts (`script-src 'unsafe-inline'`) because Vite's
  React fast-refresh requires an inline preamble; production stays strict.

### Verify no external requests

1. Load the app and open DevTools → Network.
2. Use the app normally (log, import, export, navigate tabs).
3. Confirm no requests except same-origin document/assets (and `connect-src 'self'` only for the service worker scope).
4. Disable network (offline mode) and reload — the app must remain fully usable after the first cache.

## Project structure

```text
src/
  core/       # Pure domain logic (ADIF, model, bands, dupes) — no DOM
  storage/    # IndexedDB layer
  ui/         # React UI
fixtures/     # Sample .adi files for tests
```

The ADIF fixtures and files under `samples/` contain illustrative test data only. They are not
exports of a contributor's station log.

## Security

Please report suspected vulnerabilities according to [SECURITY.md](SECURITY.md). Do not attach
private station logs or exported ADIF files to public issues.

## License

MIT — see [LICENSE](LICENSE).

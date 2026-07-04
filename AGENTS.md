# AGENTS.md

Guide for coding agents and human contributors working on FieldLog.

## Project overview

FieldLog is an offline-first amateur radio logging PWA. It runs entirely in the browser with no backend. All QSO data is stored locally in IndexedDB and leaves the device only via explicit ADIF export. ADIF correctness is the core technical risk — domain logic lives in pure TypeScript modules under `src/core/` with no framework or DOM dependencies.

## Setup commands

Requires **Node 22** (see `.nvmrc`; `nvm use` picks it up). Older Node versions fail.

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production bundle in dist/
npm run preview    # serve dist/ locally
```

## Test & lint commands

```bash
npm test
npm run test:coverage
npm run test:e2e
npm run lint
npm run format
npm run format:check
```

## Code style & conventions

- **TypeScript strict mode** — keep `strict` enabled in `tsconfig.app.json`.
- **Prettier** for formatting; **ESLint** for lint rules.
- **Conventional Commits** encouraged: `feat:`, `fix:`, `test:`, `docs:`, etc.
- **Module boundaries**: `src/core/` must never import from `ui/`, `storage/`, React, or DOM APIs. UI and storage consume core modules only.
- Keep dependencies minimal and auditable. Justify any new runtime dependency here before adding.

## Architecture

| Layer   | Path             | Responsibility                                                                |
| ------- | ---------------- | ----------------------------------------------------------------------------- |
| Core    | `src/core/`      | ADIF parse/serialize, QSO model, band plan, dupes — pure, heavily unit-tested |
| Storage | `src/storage/`   | IndexedDB read/write; swappable persistence                                   |
| UI      | `src/ui/`        | React components, hooks, styles                                               |
| PWA     | `vite.config.ts` | Service worker + manifest via `vite-plugin-pwa`                               |

The ADIF parser reads byte-accurate field lengths per the ADIF spec in a single pass —
header/record boundaries come from `<EOH>`/`<EOR>` terminals seen outside field data, never
from regex scans over the raw text. Round-trip tests in `src/core/adif/parser.test.ts` are
the correctness gate.

### Storage-layer invariants

- `src/storage/db.ts` holds **one cached IndexedDB connection** (module-level promise). Do
  not reintroduce per-operation `indexedDB.open` calls; handle `onblocked` and
  `versionchange` when touching the open logic.
- Quota failures must surface as `StorageError` with `quotaExceeded: true` so the UI can
  show an actionable message.
- `getSession` merges stored sessions over `DEFAULT_SESSION` — add new `SessionContext`
  fields with sensible defaults there and they migrate automatically.
- `createQsoId` must keep working in insecure contexts (plain-HTTP LAN serving):
  `crypto.randomUUID` is not available there, hence the `getRandomValues` fallback.

### Theming

Themes are CSS custom-property swaps on `:root[data-theme='…']` in `src/ui/styles/app.css`
(`red` = night mode). The choice persists in `localStorage` (`fieldlog-theme`), applied
before first paint in `src/main.tsx`. Add new colors as custom properties, never hardcoded
per-theme values in components.

## Critical invariants — do not violate

1. **No runtime network requests** — no CDNs, analytics, external fonts, callsign APIs, or telemetry.
2. **Strict CSP** — `default-src 'self'; connect-src 'self'` injected as a meta tag into the production build and set on preview headers (see `vite.config.ts`). The dev server relaxes only `script-src` with `'unsafe-inline'` for the react-refresh preamble; never weaken the build/preview policy.
3. **Local-only persistence** — IndexedDB; no cloud sync, no accounts.
4. **No `eval`**, no inline event handlers that weaken CSP.
5. **Import safety** — malformed ADIF must never corrupt the existing log.
6. **Domain purity** — ADIF/band/dupe logic stays in `src/core/`, not in React components.

## Verify offline guarantee

1. `npm run build && npm run preview`
2. Load app once (populates service worker cache).
3. DevTools → Application → Service Workers — confirm active.
4. DevTools → Network → set Offline — reload page.
5. Log a QSO, view log, export ADIF — all must work.
6. Network tab during normal use shows no external origins.

## Commit / PR conventions

- Incremental commits with clear messages.
- All tests and lint must pass before merge.
- ADIF changes require round-trip test updates.
- New UI features should remain keyboard-accessible with ARIA labels.

## Dependencies

| Package          | Purpose                   |
| ---------------- | ------------------------- |
| react, react-dom | UI framework              |
| vite             | Build tooling             |
| vite-plugin-pwa  | Service worker + manifest |
| vitest           | Unit tests                |
| @playwright/test | E2E smoke tests           |

No other runtime dependencies by design.

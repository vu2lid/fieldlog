# AGENTS.md

Guide for coding agents and human contributors working on FieldLog.

## Project overview

FieldLog is an offline-first amateur radio logging PWA. It runs entirely in the browser with no backend. All QSO data is stored locally in IndexedDB and leaves the device only via explicit ADIF export. ADIF correctness is the core technical risk — domain logic lives in pure TypeScript modules under `src/core/` with no framework or DOM dependencies.

## Setup commands

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

The ADIF parser reads byte-accurate field lengths per the ADIF spec. Round-trip tests in `src/core/adif/parser.test.ts` are the correctness gate.

## Critical invariants — do not violate

1. **No runtime network requests** — no CDNs, analytics, external fonts, callsign APIs, or telemetry.
2. **Strict CSP** — `default-src 'self'; connect-src 'self'` in `index.html` meta tag and Vite server/preview headers.
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

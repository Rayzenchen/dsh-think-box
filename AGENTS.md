# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the Host half of the plugin: the entry point (`src/index.ts` re-exports `src/plugin.ts`), the Schemastery config with its volatile preference fields, the settings RPC channel, and the reasoning-translation bridge. Browser code lives in `src/client/`: React components, hooks, locales, and CSS Modules, with `src/client/index.ts` as its entry point. Tests in `tests/` separate host and browser behavior with names such as `stream.client.spec.tsx` and `settings.host.spec.tsx`; `tests/shims/` holds the Vitest-only doubles of the Host browser packages (the real ones are prebuilt `window.__ModuleLoader__` bundles). `locale/` carries the Plugins-page metadata (including `meta.detail`, which points at `docs/DETAIL.md`), and `cordis.patch.yml` is the default config layer injected when this package is loaded as a bundle. `benchmarks/` and `scripts/run-stream-benchmark.mjs` hold the stream benchmark and its harness; `lib/` is generated. Do not reference the harness checkout by relative path: DSH contracts are described in this repository's README/DETAIL and in the installed Harness packages, and a `../deepseek-harness` sibling no longer exists for this fork.

## Build, Test, and Development Commands

Prefer the executables under `node_modules/.bin` directly. The `pnpm` scripts can trigger a dependency reinstall on this machine (which aborts without a TTY), so use:

- `./node_modules/.bin/tsc -p tsconfig.json --pretty false` — strict type check, no emit.
- `./node_modules/.bin/vitest run` — full suite once under jsdom.
- `./node_modules/.bin/vitest run tests/stream.client.spec.tsx` — one suite.
- `./node_modules/.bin/tsdown` — build the Host ESM library (`lib/index.js`) and browser bundle (`lib/client.js`).
- `node scripts/check-lib-fresh.mjs` — verify `lib/` is newer than `src/client` (the Host serves a boot-rev'd bundle).
- `node scripts/run-stream-benchmark.mjs` — record stream-engine benchmarks; review result changes manually.

Node `^22.19.0 || >=24` is required. The fork commit dropped the upstream standalone browser-reproduction harness, so this repository has no bundling target for it; browser QA goes through the Vitest suite and the dev-only scripts.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, single quotes, no semicolons, and trailing commas. Include `.ts`/`.tsx` extensions in imports and use `import type` for types. React components and files use `PascalCase`; hooks start with `use`; constants use `UPPER_SNAKE_CASE`. Scope styles with `*.module.css`. Preserve the Host/client boundary: browser dependencies must pass `tsdown.config.ts` purity checks, and cross-plugin collaboration should use Cordis services rather than value imports. Never statically import runtime symbols from `@deepseek-ai/*` (type imports are erased and safe); prefer structural interfaces and lazy `ctx.get()` lookups.

## Testing Guidelines

Use Vitest, Testing Library, and jsdom. Name tests `*.spec.tsx` and add regressions to the relevant Host or browser suite. Control animation, timers, layout metrics, and globals deterministically, then clean them up — the per-document `FrameCoordinator` must be shut down between cases or leaked tasks poison later ones. There is no coverage threshold; every behavioral fix should add a focused assertion.

Current baseline: **269 of 297 tests pass**. The 28 known failures are pre-existing streaming geometry/timing cases (`stream.client.spec.tsx`, 18) and logarithmic-fade cases (`logarithmic-fade.client.spec.tsx`, 10); they are tracked, not green, and new failures are not acceptable. Before submitting, run the type check, the full suite, and `tsdown`, and compare failures against this baseline rather than assuming "all green".

## Commit & Pull Request Guidelines

History uses concise Conventional Commit subjects: `feat: add ...`, `fix: prevent ...`, `docs: update ...`, and `chore: release ...`. Keep commits focused and summaries imperative. Pull requests should explain user-visible effects, call out Harness API or configuration changes, list verification commands, and link issues. Include screenshots or a short recording for settings, rendering, scrolling, or other motion-sensitive UI changes.

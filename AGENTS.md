# Repository Guidelines

## Project Structure & Module Organization

`src/` is the Host half: the plugin entry (`src/index.ts` → `src/plugin.ts`), the Schemastery config, the loopback settings RPC, and the reasoning-translation/catalog bridge. `src/client/` is the browser half: the reasoning-box renderer (`ReasoningAssistantNodeView.tsx`), its disclosure chrome, the reveal/fade engines (`useReasoningReveal.ts`, `useLogarithmicFade.ts`, `FrameCoordinator.ts`), the Plugins-page settings card (`ThinkBoxCard.tsx` + controller), the translation channel and the model-route picker (`TranslationModelPicker.tsx`), locale dictionaries, and the translation client/runtime. Tests in `tests/` split Host and browser behavior (`*.host.spec.tsx` / `*.client.spec.tsx`); `tests/shims/` holds the Vitest doubles of the Host browser packages (the real ones are prebuilt bundles).

Release assets: `icon.svg` is the 36×36 Plugins-page icon (exported as `./icon`); `docs/preview.svg` illustrates the page and MUST show both the reasoning box and the existing settings card / model-route picker; `docs/DETAIL.zh.md` and `docs/DETAIL.md` are the per-locale detail documents pointed to by `locale/*.json` `meta.detail`. `locale/` carries the Plugins-page metadata, `cordis.patch.yml` is the default config layer injected when the package is loaded as a bundle, and `lib/` is the committed release build. `.github/workflows/verify.yml` runs the pnpm verification pipeline. `scripts/` contains only `check-lib-fresh.mjs`; `FIX-REPORT-2026-10-11.md` is a historical scroll/composer report, not current behavior.

The Plugins page intentionally renders **two things together**: the icon/title/description/detail header from the package metadata plus the existing `plugins.bundle.config` settings card (`ThinkBoxConfigPage`, including the model-route picker). Never remove or replace that card registration when changing metadata or docs.

## Build, Test, and Development Commands

Prefer the executables under `node_modules/.bin` on this machine. The `pnpm` scripts can trigger a dependency reinstall (which aborts without a TTY), so use:

- `./node_modules/.bin/tsc -p tsconfig.json --pretty false` — strict type check, no emit.
- `./node_modules/.bin/vitest run` — full suite once under jsdom.
- `./node_modules/.bin/vitest run tests/think-box.client.spec.tsx` — one suite.
- `./node_modules/.bin/tsdown` — build the Host ESM library (`lib/index.js`) and browser bundle (`lib/client.js`).
- `node scripts/check-lib-fresh.mjs` — verify `lib/` is newer than `src/client` (the Host serves a boot-rev'd bundle).

Node `^22.19.0 || >=24` is required. CI (`.github/workflows/verify.yml`) uses pnpm with the lockfile and runs install, typecheck, tests, build, and `check-lib-fresh`. There is no standalone browser-reproduction harness or benchmark target in this repository.

## Coding Style & Naming Conventions

Follow the existing two-space indentation, single quotes, no semicolons, and trailing commas. Include `.ts`/`.tsx` extensions in imports and use `import type` for types. React components and files use `PascalCase`; hooks start with `use`; constants use `UPPER_SNAKE_CASE`. Scope styles with `*.module.css`. Preserve the Host/client boundary: browser dependencies must pass `tsdown.config.ts` purity checks, and cross-plugin collaboration should use Cordis services rather than value imports. Never statically import runtime symbols from `@deepseek-ai/*` (type imports are erased and safe); prefer structural interfaces and lazy `ctx.get()` lookups, and resolve renamed Harness icon exports through `src/client/harnessIcons.ts` rather than importing icon names directly.

## Testing Guidelines

Use Vitest, Testing Library, and jsdom. Name tests `*.spec.tsx` and add regressions to the relevant Host or browser suite. Control animation, timers, layout metrics, and globals deterministically, then clean them up: the per-document `FrameCoordinator` and its highlight registry are shared, so shut the frame clock down between cases or tasks leak into later tests. Do not use `it.skip`/`describe.skip`; the suite is expected to stay fully green.

Current baseline: **155 of 155 tests pass** (no skips). The reasoning box keeps dedicated regressions for the inline three-line window, click-to-open body, one-shot settle flourish, groupPart split, takeover swap/restore/late-register, `turnProcess` fold, and reduced-motion bypass. Settings has Host, channel, and card suites; translation has Host, runtime, client and catalog suites; the model picker has summary/pane/search/selection/layout/icon-compatibility regressions. Before submitting, run the type check, the full suite, and `tsdown`.

## Plugin Contracts Worth Knowing

- `applied` takeover: only the built-in `assistant-step` entry is swapped in place; a `priority: -100` shadow is registered solely when the composition declares no built-in row.
- Settings: `enabled` and `thinkAutoExpand` are volatile fields in the profile entry; `configEditor.edit()` writes only the two fields plus the translation seed, so legacy keys disappear on the first save.
- Boot bridge: `window.__DSH_THINK_BOX_CONFIG__` carries a plain `{ enabled, thinkAutoExpand, translation }` snapshot; tolerate extra fields from an older Host and fail loudly only on a malformed preference.
- Translation: the reasoning box consumes translated fragments only while its toggle (or `autoTranslate`) is active; the original feed is never sent otherwise. The catalog reader uses the Host `llm` service and degrades to `translation/route-unavailable` when it cannot resolve it.
- Model picker: selections are staged with `editTranslation` and persist only through the translation channel's Save; the picker must never write settings itself.

## Commit & Pull Request Guidelines

History uses concise Conventional Commit subjects: `feat: add ...`, `fix: prevent ...`, `docs: update ...`, `refactor: ...`, `test: ...`. Keep commits focused and summaries imperative. Pull requests should explain user-visible effects, call out Harness API or configuration changes, list verification commands, and include screenshots or a short recording for motion- or layout-sensitive UI changes.

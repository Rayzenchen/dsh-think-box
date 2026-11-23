# Reasoning display enhancement (@local/dsh-think-box)

A local fork of a DeepSeek Harness (`dsh`) browser plugin. It is forked from [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream) at upstream **v0.7.0** and does not track upstream releases (upstream is at 0.8.0; those changes are unmerged here).

Three layers sit on top of the upstream streaming engine:

1. **Reasoning box** — the model's thinking is a permanent multi-line box beside the Think row instead of a collapsed disclosure.
2. **Smooth streaming** — per-character reveal for answer text plus damped viewport follow, so bursts do not jump the page.
3. **Reasoning translation** — optional translation of reasoning text via the official cot-translation bundle or any registered model route.

[简体中文](README.md) · [Plugin-page detail](docs/DETAIL.md)

---

## Features

### 1. Inline reasoning box

- While streaming, reasoning text appears in a multi-line box beside the Think row; by default it occupies three lines and does not inflate the transcript.
- Click the Think row to open the full reasoning body below it (up to 18 lines, shrinking to fit shorter content); click again to collapse.
- When thinking ends the box performs one settle flourish: follow to the latest line, hold briefly, glide back to the first line, then collapse to a single line.
- Reasoning from restored history never replays the flourish; it renders in its settled one-line state.

### 2. Smooth answer text

- Reveal cadence and viewport motion are separate state machines: text is revealed at an arrival-tracking rate and the viewport follows with damping instead of `scrollTop = scrollHeight` jumps.
- Reveal applies backpressure when the follower cannot keep up, so text does not run out of the visible area.
- Pacing preset: `realtime` (closest to arrival), `balanced` (default), `silky` (smoothest).
- **Logarithmic fade** fades new tail text into its original colour; code, math and reasoning summaries are skipped, and browsers without range-based highlighting fall back to plain rendering.
- **Render diagnostics** is off by default; enabling it shows live FPS, backlog and follow-lag metrics on the right side of the chat.

### 3. Reasoning translation (optional)

- A "Show translation / Show original" toggle appears on the Think row. Translation only replaces the text shown in the reasoning box; reveal and follow are unchanged.
- Two backends:
  - `bundle`: the official "reasoning translation" bundle (Google / Bing / native DeepSeek APIs); the bundle must be enabled on the Plugins page;
  - `llm`: the plugin's Host half forwards to any registered DSH model route (for example the free OpenCode Go DeepSeek 4.1 Flash), in roughly 4000-character chunks.
- Streaming blocks translate finished fragments incrementally while the unterminated tail stays in the original language; historical blocks are manual.

---

## Install and enable (this machine)

This machine does not install the package from npm; the repository is linked into the `desktop` profile:

1. The profile `package.json` dependency points at this checkout:
   ```json
   { "@local/dsh-think-box": "link:/Users/wench/Documents/DS Harness/dsh-think-box-plugin" }
   ```
2. The package appears in the profile's `dsh.profile.bundles` list; the repository's `cordis.patch.yml` supplies its default config.
3. After starting/refreshing DSH Web, open the **Plugins page in the sidebar**, find "Reasoning display enhancement (@local/dsh-think-box)" and enable it. Turning its master switch off hands rendering back to the built-in Harness UI.

The Host log line `[dsh-think-box] plugin loaded!` means the Host half is loaded.

---

## Settings and storage (two separate places)

### Card switches → profile entry config

The switches on the "Reasoning display enhancement" card (enable smooth streaming, take over scrolling, pacing preset, motion preference, auto-expand thinking, logarithmic fade, render diagnostics and its tuning) are editable and persisted in the profile entry config:

```
~/.dsh/profiles/<profile>/cordis.patch.yml
```

in the `id: think-box` row (`name: '@local/dsh-think-box'`). These are volatile config fields: saving writes the profile patch and the host Loader commits the values into the running plugin **without a restart** and without remounting the renderer. On a profile where no writable entry exists (for example, an environment not managed by the Loader), the card honestly reports itself as read-only.

### Translation settings → separate file

The translation channel (backend, provider/model, reasoningEffort, target language, chunk limits, timeouts, `autoTranslate`) is not stored in the profile entry; it lives in:

```
~/.dsh/think-box/translation.json
```

The `translation:` block in `cordis.patch.yml` only seeds the first launch; afterwards that file is the source of truth. Translation results are kept per Session (`llm` translations are kept in page memory only and are not written to the Session record).

---

## Translation privacy

- Enabling translation and sending reasoning text means **that text is sent to the translation service or model route you selected**: `bundle` sends it to the selected official service (Google / Bing / native DeepSeek APIs), `llm` sends it to the configured `provider`/`model`.
- Automatic sending is governed by the **`autoTranslate`** setting. The default shipped in this repository's `cordis.patch.yml` is **on**: while reasoning streams, finished fragments are sent automatically. Turn it off on the Plugins page and translation is sent only when you click "Show translation".
- **Historical reasoning blocks are always manual**, even with `autoTranslate` on.
- If you do not want translation, leave the translation channel off or simply do not click the toggle. The plugin sends conversation content nowhere else.

---

## Compatibility

- **Tested kernel: DSH `0.2.2-rc.5` (local desktop app).** The plugin relies on several **non-public seams**; re-regress after every DSH upgrade:
  - 0.2.x renders each keyed Chat entry as its own seat, so the plugin swaps the built-in `assistant-step` row's component in place instead of shadowing it at a lower priority;
  - 0.2.x mounts the same assistant step twice via `groupPart` (reasoning / response rows); the plugin filters by `groupPart` to avoid duplicate rendering;
  - it depends on Harness DOM conventions such as `data-conversation-scroll` to measure the conversation scroller;
  - the settings card uses the plugin's own loopback RPC channel; where the Connection service is not injectable from a plugin scope on 0.2.x, it falls back to a directly registered WebServer route (still behind loopback + the app token);
  - settings persistence uses the 0.2.x `configEditor` plus volatile config fields; the old `settings.register` namespace no longer exists in 0.2.2.
- Upstream `dsh-smooth-stream` is at **0.8.0**; this fork is based on **0.7.0** and has not merged later upstream work.
- Do not statically import **runtime symbols** from `@deepseek-ai/*` (type imports are fine): the host may redirect bare imports into its own source, and a host rename/removal then breaks startup. This repository only uses `schemastery` on the Host side and the Harness slot/locale/connection contracts on the browser side.

---

## Known issues

- **The old post-turn scrolling / composer-position bug is still unresolved**: the root cause is unconfirmed; investigation notes and hand-off suggestions are in [`FIX-REPORT-2026-10-11.md`](FIX-REPORT-2026-10-11.md). It is also unfixed upstream; follow that document's "unresolved" section first when it reproduces.
- **The test suite is only partially restored**: the current full run is `269/297`; the remaining 28 are pre-existing streaming geometry/timing and logarithmic-fade failures (`stream` 18, `logarithmic-fade` 10). They are tracked, not green.
- Relative links inside the Plugins-page detail document are rendered as plain text, so the docs do not rely on link navigation.

---

## Development

Do not use the `pnpm` scripts on this machine (`pnpm install`/`prepare` can trigger a full dependency reinstall and abort without a TTY). Run the executables under `node_modules/.bin` directly:

```sh
./node_modules/.bin/tsc -p tsconfig.json --pretty false   # type check
./node_modules/.bin/vitest run                           # full suite (jsdom)
./node_modules/.bin/tsdown                               # build Host + browser bundles into lib/
node scripts/check-lib-fresh.mjs                          # verify lib/ is newer than src/client
```

- Node: `^22.19.0 || >=24`.
- `lib/index.js` is the Host half and `lib/client.js` the browser bundle; both are generated by `tsdown` — never edit them by hand. The Host serves the browser half from `lib/client.js` under a boot revision, so after changing sources rebuild and refresh/restart the host.
- Test doubles live in `tests/shims/`: `client-runtime.ts` / `client-locale.ts` mirror the host browser packages (the real packages are prebuilt `window.__ModuleLoader__` bundles and cannot be imported directly in Vitest).
- `./node_modules/.bin/vitest run <file>` runs one suite; re-run the full suite to confirm no new failures (current baseline 269/297).
- Optional: `node scripts/run-stream-benchmark.mjs` records stream-engine benchmarks; `benchmarks/` holds the harness.

---

## Layout

```
src/                 Host half (plugin entry, config, settings RPC, translation bridge)
src/client/          Browser half (React components, hooks, locales, CSS Modules)
tests/               Host/client suites (*.host.spec.tsx / *.client.spec.tsx)
tests/shims/         Host-package doubles for Vitest
locale/              Plugin metadata and Plugins-page copy (meta.detail -> docs/DETAIL.md)
docs/DETAIL.md       Plugins-page "detail" document
cordis.patch.yml     Default config layer injected when loaded as a bundle
scripts/             Benchmarks, diagnostics and dev probes
benchmarks/          Streaming-engine benchmark harness
lib/                 Build output (generated, do not edit)
```

---

## Upstream and license

This repository is modified from [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream) (v0.7.0, MIT). The upstream reveal/follow engine, animations and parts of the tests are still used; this fork rebuilt the reasoning box, added reasoning translation, and moved settings onto the 0.2.x profile-config mechanism.

Released under the MIT license; see [LICENSE](LICENSE). Upstream copyright belongs to its original authors, and this fork's changes are provided under the same MIT terms.

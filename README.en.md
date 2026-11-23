# Reasoning display enhancement (@local/dsh-think-box)

A local DeepSeek Harness (`dsh`) browser plugin that puts the model's reasoning into an inline box beside the Think row, with optional reasoning translation. It was originally forked from an upstream project (historical attribution at the end).

The plugin does exactly two things: **the reasoning box** and **reasoning translation**. The answer body is rendered by Harness itself.

---

## Features

### 1. Inline reasoning box

- While reasoning streams, the text appears in a multi-line box beside the Think row; by default it occupies three lines and does not inflate the transcript.
- Click the Think row to open the full reasoning body below (up to 18 lines, shrinking to fit shorter content); click again to collapse.
- When thinking ends the box performs one settle flourish: follow to the latest line, hold briefly, glide back to the first line, then collapse to a single line. It runs once per stream.
- Restored history never replays the flourish; it renders in its settled one-line state.
- The Host's `turnProcess` fold contract is preserved: folded reasoning hides into the Host's process summary and comes back on find-in-page.

### 2. Reasoning cadence

- Reasoning text is revealed at a fixed `balanced` cadence and the inline box follows its own content. This is the box's cadence, not body streaming.
- The logarithmic fade is **always on**: new tail text fades into its original colour; code, math and reasoning summaries are skipped.
- When the OS asks for reduced motion, reveal and fade are skipped and the text renders immediately. There is no motion-preference setting any more.

### 3. Reasoning translation (optional)

- The Think row carries a "Show translation / Show original" toggle; translation only replaces the text shown in the box.
- Two backends:
  - `bundle`: the official "reasoning translation" bundle (Google / Bing / native DeepSeek APIs), enabled on the Plugins page;
  - `llm`: the plugin's Host half forwards to any registered DSH model route (for example the free OpenCode Go DeepSeek 4.1 Flash), in roughly 4000-character chunks.
- Streaming blocks translate **finished fragments** incrementally while the unterminated tail stays in the original language; historical blocks are manual.

---

## Install and enable (this machine)

The repository is linked into the `desktop` profile rather than installed from npm:

1. The profile `package.json` dependency points at this checkout:
   ```json
   { "@local/dsh-think-box": "link:/Users/wench/Documents/DS Harness/dsh-think-box-plugin" }
   ```
2. The package appears in the profile's `dsh.profile.bundles` list; `cordis.patch.yml` supplies its default config.
3. After starting/refreshing DSH Web, open the **Plugins page** in the sidebar, find "Reasoning display enhancement" and enable it. Turning the master switch off hands rendering back to the built-in Harness UI.

The Host log line `[dsh-think-box] plugin loaded!` means the Host half is loaded.

---

## Settings and storage

The Plugins-page card has three parts: **enable**, **auto-follow reasoning**, **translation channel**.

### Card switches → profile entry config

`enabled` and `thinkAutoExpand` are persisted in the profile entry config:

```
~/.dsh/profiles/<profile>/cordis.patch.yml
```

in the `id: think-box` row. Both are volatile fields: saving writes the profile patch and the host Loader commits the values into the running plugin **without a restart**. A profile without a writable entry shows the card as read-only.

### Translation settings → separate file

The translation channel (backend, provider/model, reasoningEffort, target language, chunk limits, timeouts, `autoTranslate`) lives in:

```
~/.dsh/think-box/translation.json
```

The `translation:` block in `cordis.patch.yml` only seeds the first launch; afterwards that file is authoritative. Translations are kept per Session (`llm` translations stay in page memory only).

---

## Translation privacy

- Enabling translation sends **reasoning text to the selected service or model route**: `bundle` uses the selected official service, `llm` uses the configured `provider`/`model`.
- `autoTranslate` controls automatic sending. The repository seed defaults it on; the effective value is whatever `~/.dsh/think-box/translation.json` currently holds (off on this machine today). With it off, translation is sent only when you click "Show translation".
- **Historical reasoning blocks are always manual**, even with `autoTranslate` on.
- If you do not want translation, do not click the toggle or turn the channel off. The plugin sends content nowhere else.

---

## Compatibility

- **Tested kernel: DSH `0.2.2-rc.5` (local desktop app).** The plugin relies on several **non-public seams**; re-regress after every DSH upgrade:
  - 0.2.x renders each keyed Chat entry as its own seat, so the plugin **swaps the built-in `assistant-step` row's component in place** to host the reasoning box (there is no reasoning-row slot);
  - 0.2.x mounts the same step twice via `groupPart` (reasoning / response); the plugin filters by `groupPart` to avoid duplicates;
  - it depends on the Host's `turnProcess` fold contract (answer-inline reasoning hides into the summary and returns on find-in-page);
  - the settings card uses the plugin's own loopback RPC; where the Connection service is not injectable it falls back to a directly registered WebServer route (still behind loopback + the app token);
  - settings persistence uses the 0.2.x `configEditor` plus volatile config fields; the old `settings.register` namespace no longer exists in 0.2.2.
- Do not statically import **runtime symbols** from `@deepseek-ai/*` (type imports are fine).

---

## Known limits

- This plugin **no longer owns the answer body or scrolling**: body reveal, viewport follow, presets, scroll takeover and the diagnostics panel are gone. The old post-turn scroll/composer issue is kept as a historical record in [`FIX-REPORT-2026-10-11.md`](FIX-REPORT-2026-10-11.md); the plugin no longer participates in that path.
- Translation covers the reasoning box only.
- The full suite is `129/129` green with no skips; the reasoning box, settings and translation each have dedicated regressions.

---

## Development

Do not use the `pnpm` scripts on this machine (`pnpm install`/`prepare` can trigger a full dependency reinstall and abort without a TTY). Run the executables under `node_modules/.bin`:

```sh
./node_modules/.bin/tsc -p tsconfig.json --pretty false   # type check
./node_modules/.bin/vitest run                           # full suite (jsdom)
./node_modules/.bin/tsdown                               # build Host + browser bundles into lib/
node scripts/check-lib-fresh.mjs                          # verify lib/ is newer than src/client
```

- Node: `^22.19.0 || >=24`.
- `lib/index.js` is the Host half and `lib/client.js` the browser bundle; both are generated by `tsdown` — never edit them by hand. Rebuild and refresh/restart the host after changing sources.
- Test doubles live in `tests/shims/` (`client-runtime.ts`, `client-locale.ts`).
- `./node_modules/.bin/vitest run <file>` runs one suite; the full suite must stay 129/129 green.

---

## Layout

```
src/                 Host half (entry, config, settings RPC, translation bridge)
src/client/          Browser half (reasoning view, reveal/fade, card, translation)
tests/               host/client suites (*.host.spec.tsx / *.client.spec.tsx)
tests/shims/         Host-package doubles for Vitest
locale/              Plugin metadata (meta.detail -> docs/DETAIL.md)
docs/DETAIL.md       Plugins-page "detail" document
cordis.patch.yml     Default config layer when loaded as a bundle
scripts/             Only check-lib-fresh.mjs
lib/                 Build output (generated, do not edit)
```

---

## Upstream and license

Originally forked from [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream) (v0.7.0, MIT); the reasoning box, translation and settings layers are local work.

Released under the MIT license; see [LICENSE](LICENSE). Upstream copyright belongs to its original authors, and this fork's changes are provided under the same MIT terms.

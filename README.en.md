# Reasoning display enhancement (@local/dsh-think-box)

English | [中文](README.md)

<p><img src="icon.svg" width="72" height="72" alt="Reasoning display enhancement icon: a three-line reasoning card with a two-way model-route arrow"></p>

Puts the model's reasoning into an **inline reasoning box** beside the Think row and translates that reasoning into the UI language on demand. The translation channel includes a **model-route picker** matching the composer model menu (provider / model / reasoning effort).

The plugin does two things: **the reasoning box** and **reasoning translation**. The answer body gets no plugin effects — no per-character reveal, viewport follow, scroll takeover or fade; Harness renders it directly with its Markdown components. The built-in `assistant-step` row is swapped only to host the reasoning box.

Current version **1.0.0**. The Plugins-page abstract illustration is [`docs/preview.svg`](docs/preview.svg); the English detail doc is [`docs/DETAIL.md`](docs/DETAIL.md).

---

## Install

**Requires** DeepSeek Harness `0.2.2-rc.5` or newer (`engines.dsh` declares `>=0.2.2-rc.5 <0.3.0`).

From GitHub (`v1.0.0` is the release tag):

```sh
dsh plugin --profile <profile> add github:Rayzenchen/dsh-think-box#v1.0.0
```

From a local checkout (link for development):

```sh
dsh plugin --profile <profile> add /path/to/dsh-think-box
```

In the Desktop app an agent can install the same spec through `plugin_manager`'s `install_bundle`. Refresh the page after installing; the client takeover and the settings card appear together. Remove it with:

```sh
dsh plugin --profile <profile> remove @local/dsh-think-box
```

## Features

### Inline reasoning box

- While reasoning streams, the text appears in a multi-line box beside the Think row: three lines by default, so it does not inflate the transcript.
- Click the Think row to open the full body (up to 18 lines, shrinking for short content); click again to collapse.
- When thinking ends the box settles once: follow the latest line, hold briefly, glide back to the first line and collapse to one line. It runs once per stream and never on restored history.
- The Host's `turnProcess` fold contract is preserved: folded reasoning hides into the process summary and returns on find-in-page.

### Cadence and fade

- Reasoning uses one fixed `balanced` reveal cadence and the inline box follows its own content; this is the box's cadence, not body streaming.
- The logarithmic fade is **always on**; code, math and reasoning summaries are skipped.
- Under OS reduced motion both reveal and fade are skipped and the text renders immediately.

### Reasoning translation

- The Think row toggles between “Show translation” and “Show original”; translation only replaces the text shown in the box.
- Two backends: the official reasoning-translation bundle (`bundle`), or any registered DSH model route (`llm`, in roughly 4000-character chunks).
- While streaming, only **finished** fragments are translated; the unterminated tail stays original, and historical blocks are always manual.

### Model-route picker

The translation channel merges the old provider / model / effort fields into one summary (`provider · model · effort`). Opening it shows a card matching the composer model menu: provider-grouped models, search above four models, trailing checks, and a reasoning-effort list. **Selections are staged only** and land on disk through the channel's Save button; a failed catalog load offers Retry and never blocks saving the other fields.

> The Plugins-page **settings card is always expanded, no click needed**: the page is the plugin icon / title / description / detail illustration plus that card (including the model-route picker). Both are visible together.

## Settings

The Plugins-page card has three parts:

1. **Enable** — turning it off hands rendering back to the built-in Harness UI.
2. **Auto-follow reasoning** — whether the box follows while reasoning streams.
3. **Translation channel** — backend, model route (provider / model / reasoning effort), target language, fragment limit, `autoTranslate`. `maxTokens` / `timeoutMs` are not exposed by the card; they live in the `translation.json` seed.

`enabled` / `thinkAutoExpand` persist in the profile `cordis.patch.yml` entry (`id: think-box`); both are volatile and apply live without a restart. Translation settings live in `~/.dsh/think-box/translation.json`; the `translation:` block in `cordis.patch.yml` only seeds the first launch. A profile without a writable entry shows the card as read-only.

## Privacy

Enabling translation sends **reasoning text to the selected translation service or model route**: `bundle` uses the official bundle's selected service, `llm` uses the route's provider/model. `autoTranslate` controls automatic sending; with it off, only clicking “Show translation” sends text. Historical reasoning blocks are always manual. The plugin sends content nowhere else.

## Compatibility

- **Tested kernel: DSH `0.2.2-rc.5`.** The plugin relies on non-public seams; re-regress after DSH upgrades:
  - 0.2.x renders keyed Chat rows per entry, so the plugin **swaps the built-in `assistant-step` row's component in place** to host the reasoning box;
  - the same assistant step is mounted as reasoning / response rows via `groupPart`; the plugin filters to avoid duplicates;
  - the Host `turnProcess` fold contract;
  - the settings card uses the plugin's own loopback RPC (falling back to a direct WebServer route where Connection cannot be injected, still behind loopback + the app token);
  - persistence uses `configEditor` plus volatile config fields.
- Do not statically import **runtime symbols** from `@deepseek-ai/*` (type imports are fine): the host may redirect bare imports, and renamed or removed symbols break startup.

## Known limits

- The plugin does not own the answer body or scrolling; body reveal, viewport follow, presets, scroll takeover and the diagnostics panel are gone. The historical issue is kept in [`FIX-REPORT-2026-10-11.md`](FIX-REPORT-2026-10-11.md).
- Translation covers the reasoning box only.
- The model-route picker lists text models; a model whose reasoning metadata cannot be read stays selectable without effort choices.

## Tests

The full suite is **155/155** green with no skips. It covers the reasoning box, settings (Host/channel/card), translation (Host/runtime/client), the model catalog and the picker. Development commands:

```sh
./node_modules/.bin/tsc -p tsconfig.json --pretty false
./node_modules/.bin/vitest run
./node_modules/.bin/tsdown
node scripts/check-lib-fresh.mjs
```

## Layout

```
icon.svg             Plugins-page icon (36×36, exported as ./icon)
docs/preview.svg     Detail abstract illustration (Think row + settings card + model route)
docs/DETAIL.zh.md    Chinese detail (locale zh meta.detail)
docs/DETAIL.md       English detail (locale en meta.detail)
src/                 Host half (entry, config, settings RPC, translation/catalog bridge)
src/client/          Browser half (box, reveal/fade, settings card, model picker)
tests/               Host/client suites; tests/shims/ holds host-package doubles
locale/              Plugins-page metadata (zh/en)
cordis.patch.yml     Default config layer for the bundle
scripts/             Only check-lib-fresh.mjs
lib/                 Release build output (tsdown, committed with the package)
.github/workflows/   pnpm verify pipeline (tsc / vitest / tsdown / check-lib-fresh)
CHANGELOG.md         Release history
```

## Upstream and license

Originally forked from [Laplace-bit/dsh-smooth-stream](https://github.com/Laplace-bit/dsh-smooth-stream) (v0.7.0, MIT); the reasoning box, translation, model-route picker and settings card are local work.

Released under the MIT license; see [LICENSE](LICENSE). Upstream copyright belongs to Laplace-bit; the fork's modifications are copyright Rayzenchen, both under MIT.

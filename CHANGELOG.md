# Changelog

All notable changes to this fork are recorded here. The format follows Keep a Changelog, and releases use
[semantic versioning](https://semver.org/).

## [1.0.0] - 2026-11-26

First release of the reasoning-box-only fork.

### Added

- Inline reasoning box beside the Think row: three-line preview, 18-line body
  on click, one-shot settle flourish, and the `turnProcess` fold contract.
- Reasoning translation with the official reasoning-translation bundle or any
  registered DSH model route (llm backend, finished-fragment streaming).
- Translation model-route picker matching the composer model menu: provider
  groups, search, reasoning efforts, staged selections saved by the channel.
- Plugins-page presentation: 36×36 icon, title/description, detail illustration
  and per-locale detail docs, while keeping the settings card on the page.
- pnpm CI that runs typecheck, the full suite, the build, and the lib freshness
  check.

### Changed

- The package is now version 1.0.0 for the `Rayzenchen/dsh-think-box` release.
- Settings remain two volatile flags plus the translation channel; the
  translation settings file stays authoritative after first launch.

### Removed

- Body reveal/streaming engine, viewport follow, scroll takeover, presets,
  motion-preference toggle, debug panel and their tests/benchmarks. The answer
  body is rendered directly by Harness Markdown components.

### Tests

- 155 of 155 tests pass with no skips.

[1.0.0]: https://github.com/Rayzenchen/dsh-think-box/releases/tag/v1.0.0

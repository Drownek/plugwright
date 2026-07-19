# Changelog

All notable changes to **Paperwright** (the [`@drownek/paperwright`](https://www.npmjs.com/package/@drownek/paperwright) npm package and the [`io.github.drownek.paperwright`](https://plugins.gradle.org/plugin/io.github.drownek.paperwright) Gradle plugin) are documented here.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). The npm package and Gradle plugin are released together and share the same version number (tracked in [`version.txt`](version.txt)).

## [Unreleased]

## [1.3.2] - 2026-05-16

### Changed
- Renamed project from "Paper e2e test" to **Paperwright**.
- `scripts/bump-version.js` now drives the release flow interactively and rewrites version references in `README.md`, `docs/Getting-Started.md` and `example_plugin/build.gradle.kts` automatically.

### Fixed
- Stale links, anchors and section ordering in the README.
- Outdated `1.3.1` references in docs and the `paperwrightInit` scaffold.

## [1.3.1] - 2026-04-28

### Added
- `paperwrightInit` Gradle task that scaffolds an `src/test/e2e` test folder (`package.json`, `tsconfig.json`, sample spec) for new projects.
- Wiki docs are now committed to `/docs` in the repo and auto-synced to the GitHub Wiki on each release via the `wiki-sync` workflow.

### Fixed
- Exported missing utilities (`sleep`, `poll`, `waitForAssertion`, `waitUntil`, `waitForStable`) from the main entry point so they can be imported from `@drownek/paperwright`.
- CI now also runs on the `master` branch (previously only ran on PR branches).

## [1.3.0] - 2026-04-21

### Added
- `expect.poll(fn, options?)` for polling arbitrary values against any matcher (`toBe`, `toEqual`, `toMatchObject`, ...).
- `waitForAssertion` / `waitUntil` utilities (the former replaces the previously-internal `eventually`).
- `waitForStable` helper for waiting until a value stops changing.
- `nextMessage` method on `PlayerWrapper` for awaiting the next incoming chat message with an optional timeout.
- `toBeNear` / `toBeNearXZ` matchers (inclusive tolerance) for position assertions.
- `since` option on `toHaveReceivedMessage` to scope buffer assertions to messages received after a given index, plus `strict` / `timeout` options.
- `toThrow` / `toThrowAsync` support in `PollMatchers`.
- `useExternalPluginsOnly` option on the `PaperE2EExtension`.
- Plugin download support in the Gradle plugin (auto-fetch external plugins for the test server).
- Multi-bot tests via `createPlayer({ username })`, plus a teleportation e2e example.
- Server log validation in the runner; richer console output via `picocolors`.
- Banner with the current version printed at startup.
- `writeFiles` DSL for staging arbitrary files in the test run directory.
- Per-test timeout handling.
- Test session duration tracking and reporting.
- `typecheck` script in `runner-package` for static validation in CI.
- MIT License file.

### Changed
- `server.execute()` and `player.chat()` are now synchronous fire-and-forget (no need to `await`).
- Negated assertions now poll until the condition clears instead of failing immediately on the first sample.
- Hook scope stack is reset between test file imports so suites no longer leak across files.
- Test results are now printed after the server shuts down for cleaner output ordering.
- CI bumped to Node.js 22 and the latest action versions.
- README simplified by linking to the Getting Started guide.
- `runner-package` builds before E2E tests run in CI.

### Fixed
- Various test-leakage and disconnect-hang issues in the runner.
- `setGameMode` no longer issues redundant updates.
- Spawn protection is forced off in the test server config.
- `PlayerWrapper` uses getters for `inventory` and `username` so values stay accurate after a reconnect.
- `dist/` is cleaned before each runner-package build (#4).
- `undefined` no longer leaks as a bot username.
- Gradle correctly kills the Paper server process tree when the task is cancelled.

## [1.2.0] - 2026-02-15

### Added
- `MC_VERSION` environment variable plumbed through `TestE2ETask`; bot connects to the version under test (no more hardcoded `1.19.4`).
- Version-bump script (`scripts/bump-version.js`) to keep `version.txt`, `runner-package/package.json`, README and docs in sync.
- `pollForAbsence` helper (replaces the ad-hoc `waitAbit`) for asserting that an error did *not* appear.
- `stderr` handler in the runner so server error output is captured and logged.

### Changed
- `paperE2E` Gradle DSL block renamed to `e2e` and the `cleanPluginData` property removed.
- Test file extensions standardised for consistency.

### Fixed
- `JAVA_PATH` is now validated alongside `SERVER_JAR` / `SERVER_DIR`.
- Server process is checked before the runner attempts to send a `stop` command.
- Internal `GuiItemLocator` no longer calls deprecated `GuiWrapper` methods.
- Safety-net shutdown uses the correct exit code (no more redundant `process.exit(1)`).

## [1.1.0] - 2026-02-10

### Added
- `LiveGuiHandle` and `GuiItemLocator` for richer GUI interactions.
- Helper methods on `PlayerWrapper` and automatic GUI-stabilisation wait in `waitForGui`.

### Changed
- `waitForGui` now returns the matched `GuiWrapper` instead of `void`.
- Example test folders unified (`e2e_ts` + `e2e` -> `e2e`).
- Bot cleanup is more robust, with timeouts.

### Fixed
- Race conditions in `waitForGui` (now polls periodically).

## [1.0.4] - 2026-02-02

### Added
- Initial public release of the framework and example plugin.
- Bukkit configuration support and improved bot management.
- Test results tracking with a detailed per-session summary.
- Improved bot-username generation and cleanup formatting.
- Better error tracing and test reporting in the runner.
- `cleanE2E` exclusion patterns and richer logging.

### Changed
- Default JVM arguments removed from runner setup.
- Stack-trace utilities extracted into a separate module.
- Plugin and package identifiers moved to the `io.github.drownek` namespace.
- Wiki folder removed from the repo (moved to the GitHub Wiki at the time; later moved back in 1.3.1).

### Fixed
- `RunnerMatchers` `isNot` logic for `toHaveReceivedMessage` and `toHaveItemInInventory`.
- Build script uses `tsc` only.
- Windows compatibility for the Node.js commands invoked by `TestE2ETask`.

[Unreleased]: https://github.com/Drownek/paperwright/compare/v1.3.2...HEAD
[1.3.2]: https://github.com/Drownek/paperwright/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/Drownek/paperwright/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/Drownek/paperwright/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Drownek/paperwright/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Drownek/paperwright/compare/v1.0.4...v1.1.0
[1.0.4]: https://github.com/Drownek/paperwright/releases/tag/v1.0.4

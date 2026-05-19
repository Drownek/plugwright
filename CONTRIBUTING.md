# Contributing to Paperwright

Thanks for your interest in contributing! This repo is a small monorepo with three moving parts, so this guide is mostly about getting them to play nicely together on your machine.

## Repository layout

```
paperwright/
├── runner-package/      # @drownek/paperwright npm package (test runner, matchers, bot wrappers)
├── gradle-plugin/       # io.github.drownek.paperwright Gradle plugin (server lifecycle, tasks)
├── example_plugin/      # Sample Paper plugin used as the integration test bed
│   └── src/test/e2e/    # End-to-end test suite (also used to validate the framework)
├── docs/                # Wiki pages — auto-synced to the GitHub Wiki on release
├── scripts/bump-version.js  # Interactive version bumper for coordinated releases
└── version.txt          # Single source of truth for the project version
```

The npm package and the Gradle plugin are released together and share the same version (stored in [`version.txt`](version.txt)).

## Prerequisites

- **Java 17+** (the project targets the Java 17 toolchain)
- **Gradle 7.0+** (the example plugin ships with a wrapper, so `./gradlew` is fine)
- **Node.js 16+** (CI uses Node 22; anything newer is recommended for local dev)
- A working Minecraft-server-friendly machine (Linux/macOS/Windows all work; Windows users may need to use a compatible shell for the npm scripts)

## Local development setup

Clone, install the runner deps, build it once so the Gradle plugin can resolve the local copy, then run the example plugin's e2e suite:

```bash
git clone https://github.com/Drownek/paperwright.git
cd paperwright

# 1) Build the runner package
cd runner-package
npm install
npm run build
npm run typecheck   # optional but recommended before pushing

# 2) Run the example plugin's e2e tests against your local runner
cd ../example_plugin
./gradlew paperwrightTest
```

`example_plugin/src/test/e2e/package.json` already pins `@drownek/paperwright` to `file:../../../../runner-package`, so any change you make in `runner-package/` is picked up after a rebuild — no `npm link` dance required.

### Iterating on the Gradle plugin

`example_plugin/settings.gradle.kts` includes the local `gradle-plugin/` build, so changes to the Gradle plugin are picked up automatically when you run `./gradlew paperwrightTest` from `example_plugin/`.

### Debug logging

Verbose `[DEBUG]` lines from the bot's GUI listeners are gated behind an env var. Set it when you need them:

```bash
PAPERWRIGHT_DEBUG=1 ./gradlew paperwrightTest
```

You can also silence the startup banner with `PAPERWRIGHT_NO_BANNER=1`.

## Making a change

1. Open or comment on a [GitHub issue](https://github.com/Drownek/paperwright/issues) so we can sanity-check the direction before you sink time into it. For obvious bug fixes / typos this isn't required.
2. Branch from `master` using a short, hyphenated name. We loosely follow conventional-commit prefixes for branch names too:
   - `feat/<short-name>` – new functionality
   - `fix/<short-name>` – bug fixes
   - `docs/<short-name>` – wiki / README / CHANGELOG edits
   - `chore/<short-name>` – build, CI, dependency, or housekeeping work
   - `refactor/<short-name>` – non-behavioural code changes
3. Make focused commits. Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `ci:`, optionally scoped — `fix(runner): ...`).
4. **Run the checks locally** before pushing:
   - `npm run typecheck` and `npm run build` inside `runner-package/`
   - `./gradlew paperwrightTest` inside `example_plugin/` (this is the integration test suite; CI runs the same command)
5. **Update docs / CHANGELOG** when your change is user-visible. New entries go under the `## [Unreleased]` section of [`CHANGELOG.md`](CHANGELOG.md).
6. Open a PR against `master`. Keep the description focused on the *why*; the diff already shows the *what*.

## Adding or changing tests

The example plugin's [`src/test/e2e/`](example_plugin/src/test/e2e/) folder doubles as the framework's integration test suite. If you're touching the runner or matchers, adding a regression spec there is the easiest way to demonstrate that your change works end-to-end and to prevent it from breaking again. CI runs the same suite on every PR.

## Releasing (maintainers)

Releases are driven by `scripts/bump-version.js`, which keeps `version.txt`, `runner-package/package.json`, the README and the docs in sync, then a GitHub release is cut from the matching tag. The `wiki-sync` workflow pushes `docs/` to the GitHub Wiki on each release.

```bash
npm run bump          # interactive: pick the new version, the script rewrites the right files
git push --follow-tags
# Then create a GitHub release from the new tag.
```

## Reporting bugs

When opening an issue, please include:
- Paperwright version (from `version.txt` or the npm package version).
- Minecraft version under test (`paperwright { minecraftVersion.set(...) }`).
- Java / Node / OS versions.
- A minimal reproducer if you can — the example plugin is a good starting point.

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE) covering the rest of the project.

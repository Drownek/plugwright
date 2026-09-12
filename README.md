# Plugwright

[![Gradle Plugin Portal](https://img.shields.io/gradle-plugin-portal/v/io.github.drownek.plugwright?label=Gradle%20Plugin%20Portal)](https://plugins.gradle.org/plugin/io.github.drownek.plugwright)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Drownek/plugwright/actions/workflows/ci.yml/badge.svg)](https://github.com/Drownek/plugwright/actions/workflows/ci.yml)
[![Read The Docs](https://img.shields.io/badge/Docs-Read_Here-007EC6?logo=readthedocs&logoColor=white)](https://plugwright.dev)

End-to-end testing framework for Paper/Spigot Minecraft plugins. Supports JavaScript and TypeScript.

![Video showcase demonstrating Plugwright bots joining a server, moving, and interacting with GUIs](https://github.com/user-attachments/assets/0272a6d9-f9ab-4486-8bf3-ee5909a10ee9)

<details>
<summary>⚠️ <strong>Upgrading from Plugwright 2.x? The npm package moved.</strong></summary>
<br>
The runner is published as <code>@plugwright/runner</code> from 3.0 onwards; <code>@drownek/plugwright</code> stops receiving releases at 2.x. Change the dependency in your <code>package.json</code>, run <code>npm install</code>, and update the import in your test files. Nothing else moves: the Gradle plugin id stays <code>io.github.drownek.plugwright</code>.
See the full <a href="https://plugwright.dev/migration-v3">v2 to v3 Migration Guide</a> for layout changes, configuration updates, and new features.
</details>

## Features

`🚀` **Setup** – Automated server lifecycle management with Paper server downloads.
  * **Supported Minecraft versions:** 1.8 to 26.1 (1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.18, 1.19, 1.20, 1.21, 1.21.9, 1.21.11, 26.1)

`🎮` **Bot Testing** – Powered by Mineflayer. Bots join, move, chat, and click GUIs like real players.

`🎭` **Playwright-inspired API** – Live handles and locators for scripting player interactions.

`🧪` **Type-Safe** – Native JavaScript and TypeScript with full type safety.

`🔄` **Automatic Retries** – Built-in retry logic to handle flaky tests.

`📊` **Rich Assertions** – Custom matchers built for Minecraft mechanics.

`🔧` **Gradle Integration** – Run your entire suite with a single command.

`🌍` **Multi-Server Ready** – Run tests against staging or external servers (see [External Servers](https://plugwright.dev/external-servers)).

## Quick Start

**0. Prerequisites:**
Before you begin, you need:
- **Java 17** or higher
- **Gradle 7** or higher
- **Node.js** (for running the test runner, can be downloaded automatically by using downloadNode setting)
- **A Paper/Spigot plugin project**

**1. Add the plugin to your `build.gradle.kts`:**

```kotlin
import me.drownek.plugwright.local.LocalMode

plugins {
    id("io.github.drownek.plugwright") version "3.0.0"
}

plugwright {
    environments {
        // Paper downloaded, patched, started and killed by plugwright itself.
        create("local", LocalMode) {
            minecraftVersion.set("1.19.4")
            acceptEula.set(true)
            
            // Download some dependencies your plugin might need
            downloadPlugins {
                url("https://url.to/plugin1.jar")
                url("https://url.to/plugin2.jar")
                // ... etc
            }
        }
    }

    testsDir.set(file("src/test/e2e"))

    // If true, always downloads and uses an isolated Node.js version, ignoring the system Node.
    downloadNode.set(true)
}
```

> **💡 Tip:** If you already have Node.js installed on your system, you can comment out `downloadNode.set(true)` to speed up initialization. Otherwise, leave it uncommented.

**2. Initialize the test folder:**

Run the init command to set up your test folder. It asks where to put it, then writes an npm project with a `package.json`, a TypeScript config, a `.gitignore`, an example spec and an example runner plugin:

```bash
./gradlew plugwrightInit
```

```
src/test/e2e/
  tests/example.spec.ts          your specs go here
  plugins/example-plugin.ts      hooks, fixtures and matchers
  package.json, tsconfig.json
  .gitignore                     node_modules, dist, generated
```

Compiled specs land in `dist`, and everything an environment writes — the Paper server the local one starts, for instance — in `generated`. Neither belongs in version control. See [Project Layout](https://plugwright.dev/project-layout).

**3. Run your tests:**

```bash
./gradlew plugwrightTest
```

> **💡 Tip:** Plugwright hooks into your build process and tests against your compiled plugin jar. Ensure your plugin compiles successfully (e.g. `jar` or `shadowJar` task) before running tests!

> **💡 Want to see a working example?** Check out the [example_plugin](./example_plugin) directory in this repository.

## Why Plugwright vs MockBukkit?

|                          | **Plugwright**                                              | **MockBukkit**                                                             |
|--------------------------|-------------------------------------------------------------|----------------------------------------------------------------------------|
| **Approach**             | End-to-end – runs a real Paper server with real player bots | Unit testing – mocks the Bukkit API in-process                             |
| **Server**               | Real Paper server with actual game logic                    | No server – simulated API stubs                                            |
| **Player interaction**   | Real Mineflayer bots that join, move, chat, and click GUIs  | Mocked `Player` objects with simulated method calls                        |
| **NMS / internals**      | ✅ Full support – real server means real NMS                 | ❌ Breaks on NMS / reflection / internals                                   |
| **Plugin compatibility** | Tests the plugin exactly as players experience it           | May miss bugs caused by mock/real behavior mismatch                        |
| **Multi-plugin testing** | ✅ All plugins load together naturally                       | Limited – each mock is isolated                                            |
| **GUI testing**          | ✅ First-class support with locators and click simulation    | Partial – inventory content mocks supported; click/drag simulation limited |
| **Speed**                | Slower (server startup ~10-20s, then fast)                  | Very fast (milliseconds per test)                                          |
| **Best for**             | Integration & E2E tests, NMS-heavy plugins, GUI testing     | Fast unit tests for pure Bukkit API logic                                  |

> **💡 Tip:** Plugwright and MockBukkit work well together. MockBukkit for fast unit tests; Plugwright for end-to-end tests that verify behavior on a real server.

## Continuous Integration (CI)

Setting up CI takes less than 5 minutes. Use the official [plugwright-action](https://github.com/Drownek/plugwright-action) to run your entire test suite on every pull request.

```yaml
name: Plugwright E2E Tests

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: drownek/plugwright-action@v1
        with:
          java-version: "17"
          node-version: "24"
          # Path to your plugin gradle project if it's not at the project's root
          working-directory: "."
```

## Used in Production

<a href="https://holyworld.io/">
  <img align="left" src="https://github.com/user-attachments/assets/8c40f2ea-fa71-4299-ae05-28af23bf252c" width="80" alt="HolyWorld Logo" style="margin-right: 15px;">
</a>

<strong><a href="https://holyworld.io/">HolyWorld</a></strong> <br>
~10,000 peak online players. Plugwright powers their CI/CD pipeline for end-to-end plugin testing. <br>
<em>Integrated by <a href="https://github.com/monikon22">@monikon22</a></em>

<br clear="both"/>

## Documentation & Examples

For full examples on how to test **GUIs**, **multi-bot interactions**, **NMS**, and the complete **API Reference**, visit our official documentation site:

> 👉 **[Read the full documentation at plugwright.dev](https://plugwright.dev)**

## Support & Community

Got a question, found a bug, or want to suggest a feature? 
👉 **[Open an issue](https://github.com/Drownek/plugwright/issues)** - don't hesitate, even if it's just a beginner question!

## License

MIT

# Plugwright

[![Gradle Plugin Portal](https://img.shields.io/gradle-plugin-portal/v/io.github.drownek.plugwright?label=Gradle%20Plugin%20Portal)](https://plugins.gradle.org/plugin/io.github.drownek.plugwright)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Drownek/plugwright/actions/workflows/ci.yml/badge.svg)](https://github.com/Drownek/plugwright/actions/workflows/ci.yml)

End-to-end testing framework for Paper/Spigot Minecraft plugins. Supports JavaScript and TypeScript.

![Showcase](https://github.com/user-attachments/assets/6aa160b0-b419-4629-9824-36e109f9831b)

> [!WARNING]
> **Migration from Paperwright (v1.x to v2.0)**
> This framework has been renamed from **Paperwright** to **Plugwright**. If you are upgrading from an older version, you must update the following things in your project:
> 1. Change `id("io.github.drownek.paperwright")` to `id("io.github.drownek.plugwright")`.
> 2. Rename your `paperwright { ... }` configuration block to `plugwright { ... }` and Gradle tasks (e.g. `./gradlew paperwrightTest` to `./gradlew plugwrightTest`).
> 3. In your `package.json`, change `@drownek/paperwright` to `@drownek/plugwright` and run `npm install`.
> 4. Update your test files: `import { test } from '@drownek/paperwright'` to `import { test } from '@drownek/plugwright'`.
> 5. Change your CI to use `drownek/plugwright-action@v1`.

## Features

`🚀` **Setup** – Automated server lifecycle management with Paper server downloads.

`🎮` **Bot Testing** – Powered by Mineflayer. Bots join, move, chat, and click GUIs like real players.

`🎭` **Playwright-inspired API** – Live handles and locators for scripting player interactions.

`🧪` **Type-Safe** – Native JavaScript and TypeScript with full type safety.

`🔄` **Automatic Retries** – Built-in retry logic to handle flaky tests.

`📊` **Rich Assertions** – Custom matchers built for Minecraft mechanics.

`🔧` **Gradle Integration** – Run your entire suite with a single command.

## Quick Start

> **Prerequisites:** Java 17+, Gradle 7+, Node.js 16+, and a Paper/Spigot plugin project.

**1. Add the plugin to your `build.gradle.kts`:**

```kotlin
plugins {
    id("io.github.drownek.plugwright") version "1.3.3"
}

plugwright {
    minecraftVersion.set("1.19.4")
    testsDir.set(file("src/test/e2e"))
    acceptEula.set(true)
    
    // Download some dependencies your plugin might need
    downloadPlugins {
        url("https://url.to/plugin1.jar")
        url("https://url.to/plugin2.jar")
        // ... etc
    }
}
```

**2. Initialize the test folder:**

```bash
./gradlew plugwrightInit
```

**3. Run your tests:**

```bash
./gradlew plugwrightTest
```

See the [Getting Started](https://github.com/Drownek/plugwright/wiki/Getting-Started) guide for setup details.

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

## Examples

### Basic command test

```typescript
import { expect, test } from '@drownek/plugwright';

test('help displays message', async ({ player }) => {
  player.chat('/help');
  await expect(player).toHaveReceivedMessage('Help');
});
```

### GUI interaction

```typescript
test('admin can interact with gui', async ({ player }) => {
  await player.makeOp();

  player.chat('/example gui-settings');
  const gui = await player.gui({ title: 'guiSettings' });

  await gui.locator(item => item.getDisplayName().includes('guiItemInfo')).click();
  await expect(player).toHaveReceivedMessage('You clicked on item');
});
```

### Multi-bot testing

```typescript
test('multi-bot teleportation', async ({ player, createPlayer }) => {
  await player.makeOp();
  const friend = await createPlayer({ username: 'FriendBot' });

  await friend.teleport(100, 100, 100);
  player.chat(`/tp ${player.username} ${friend.username}`);

  await expect(player).toBeNear(100, 100, 100, { tolerance: 2 });
});
```

### Player actions

```typescript
test('teleport player', async ({ player }) => {
  await player.teleport(123, 100, 321);
  expect(player.bot.entity.position).toMatchObject({ x: 123.5, z: 321.5 });
});

test('give item to player', async ({ player }) => {
  await player.giveItem('emerald', 5);
  await expect(player).toContainItem('emerald', { count: 5 });
});
```

See [Writing Tests](https://github.com/Drownek/plugwright/wiki/Writing-Tests) for more patterns and the full [Matchers Reference](https://github.com/Drownek/plugwright/wiki/Matchers-Reference).

### Continuous Integration (CI)

Setting up CI takes less than 5 minutes. Use the official [plugwright-action](https://github.com/Drownek/plugwright-action) to run your entire test suite.
Just create a `.github/workflows/e2e.yml` file with the following content:

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: drownek/plugwright-action@v1
```

## Documentation

See the [GitHub Wiki](../../wiki):

- [Getting Started](../../wiki/Getting-Started) - Installation and setup
- [Writing Tests](../../wiki/Writing-Tests) - Test examples and patterns
- [Matchers Reference](../../wiki/Matchers-Reference) - All available assertions
- [GUI Testing](../../wiki/GUI-Testing) - Testing inventory GUIs
- [Configuration](../../wiki/Configuration) - Gradle plugin options
- [Test Filtering](../../wiki/Test-Filtering) - Running specific tests

## License

MIT
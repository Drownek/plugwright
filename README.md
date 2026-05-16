# Paperwright

[![npm version](https://badge.fury.io/js/%40drownek%2Fpaperwright.svg)](https://www.npmjs.com/package/@drownek/paperwright)
[![Downloads](https://img.shields.io/npm/dm/@drownek/paperwright.svg)](https://www.npmjs.com/package/@drownek/paperwright)

End-to-end testing framework for Paper/Spigot Minecraft plugins with support for both JavaScript and TypeScript.

## Features

`🚀` **Fast & Simple Setup** – Start testing in minutes with automated server lifecycle management and Paper server downloads.

`🎮` **Realistic Bot Testing** – Powered by Mineflayer for authentic player interaction.

`🎭` **Playwright-inspired API** – Familiar patterns using live handles and locators for intuitive scripting.

`🧪` **Type-Safe** – Native JavaScript and TypeScript support with full type safety.

`🔄` **Automatic Retries** – Built-in retry logic to eliminate flaky tests and ensure stability.

`📊` **Rich Assertions** – Custom matchers specifically designed for Minecraft mechanics.

`🔧` **Gradle Integration** – Run your entire suite with a single command.

## Quick Start

### Prerequisites

- Java 17 or higher
- Gradle 7.0 or higher
- Node.js 16 or higher
- A Paper/Spigot plugin project

### Installation

1. Setup build.gradle.kts:
```kotlin
plugins {
    id("io.github.drownek.paperwright") version "1.3.1"
}

paperwright {
    minecraftVersion.set("1.19.4")
    runDir.set("run")
    testsDir.set(file("src/test/e2e"))
    acceptEula.set(true)
}
```
2. Init tests folder: `./gradlew paperwrightInit`
3. Run tests: `./gradlew paperwrightTest`

Please refer to the [Getting Started](https://github.com/Drownek/paperwright/wiki/Getting-Started) guide for detailed setup instructions.

## Documentation

See the [GitHub Wiki](../../wiki) for comprehensive guides:

- [Getting Started](../../wiki/Getting-Started) - Installation and setup
- [Writing Tests](../../wiki/Writing-Tests) - Test examples and patterns
- [Matchers Reference](../../wiki/Matchers-Reference) - All available assertions
- [GUI Testing](../../wiki/GUI-Testing) - Testing inventory GUIs
- [Configuration](../../wiki/Configuration) - Gradle plugin options
- [Test Filtering](../../wiki/Test-Filtering) - Running specific tests

## License

MIT

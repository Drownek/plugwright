# Writing Tests

## Basic Test Structure

Tests use a simple API similar to Jest:

```javascript
import { test, expect } from '@drownek/paperwright';

test('test description', async ({ player }) => {
  // Your test code here
});
```

## Your First Test

Create `src/test/e2e/first.spec.js`:

```javascript
import { test, expect, sleep } from '@drownek/paperwright';

test('player receives welcome message', async ({ player }) => {
  await sleep(2000);
  await expect(player).toHaveReceivedMessage('Welcome');
});
```

> **Tip:** Prefer the auto-retrying matchers (e.g. `toHaveReceivedMessage`,
> `toContainItem`) over fixed `sleep()` calls. They poll until the assertion
> passes or the timeout expires, so they're both faster and less flaky.

## Common Test Patterns

### Testing Commands

```javascript
test('help command works', async ({ player }) => {
  player.chat('/help');
  await expect(player).toHaveReceivedMessage('Available commands');
});

test('admin command requires permission', async ({ player }) => {
  player.chat('/admin reload');
  await expect(player).toHaveReceivedMessage('No permission');
});
```

### Testing Economy

```javascript
test('player starts with default balance', async ({ player }) => {
  player.chat('/balance');
  await expect(player).toHaveReceivedMessage('$1000');
});

test('player can purchase items', async ({ player, server }) => {
  server.execute(`eco give ${player.username} 500`);
  player.chat('/buy diamond');
  await expect(player).toHaveReceivedMessage('Purchased');
  await expect(player).toContainItem('diamond');
});
```

### Testing Inventory

```javascript
test('player inventory has starter items', async ({ player }) => {
  player.chat('/starter');
  await expect(player).toContainItem('diamond_sword');
  await expect(player).toContainItem('bread');
});
```

### Server Operations

```javascript
test('server executes commands', async ({ player, server }) => {
  await player.makeOp();
  server.execute(`give ${player.username} diamond 64`);
  await expect(player).toContainItem('diamond');
});
```

## Test Organization with `describe`

For non-trivial suites you can group related tests and share setup/teardown
logic using `describe`, `beforeEach`, and `afterEach`:

```javascript
import { describe, test, expect, beforeEach, afterEach } from '@drownek/paperwright';

describe('Economy plugin', () => {
  beforeEach(async ({ player }) => {
    await player.makeOp();
  });

  afterEach(async ({ server, player }) => {
    server.execute(`eco reset ${player.username}`);
  });

  test('player can check balance', async ({ player }) => {
    player.chat('/balance');
    await expect(player).toHaveReceivedMessage('$');
  });
});
```

- `describe` blocks can be nested; hooks fire outermost-in for `beforeEach`
  and innermost-out for `afterEach`.
- Hooks receive the same `TestContext` as the test (`player`, `server`,
  `createPlayer`, `signal`).

### `opTest` shorthand

Most tests need the player to be opped before running commands. `opTest`
is a small convenience that calls `player.makeOp()` for you before the test
body executes:

```javascript
import { opTest, expect } from '@drownek/paperwright';

opTest('admin command works', async ({ player }) => {
  player.chat('/reload');
  await expect(player).toHaveReceivedMessage('Reload complete');
});
```

## API Reference

### Test Context

Each test (and hook) receives a context object with:

- `player` - The primary `PlayerWrapper` (a Mineflayer bot wrapper)
- `server` - Server control interface (run console commands)
- `createPlayer({ username? })` - Spawn an additional bot for multi-player tests
- `signal` - `AbortSignal` that fires when the test times out (`TEST_TIMEOUT`, default 30s)

### Player Actions

```javascript
player.chat('/command')        // Send chat/command
player.chat('Hello!')          // Send chat message
await player.gui({ title: 'Title' })     // Wait for GUI window
player.inventory                     // Access inventory
player.bot                           // Underlying Mineflayer bot
```

### Assertions

```javascript
// Chat message (partial match, 5s timeout)
await expect(player).toHaveReceivedMessage('text')

// Inventory item (5s timeout)
await expect(player).toContainItem('item_name')
```

See [Matchers Reference](Matchers-Reference) for all available assertions.

### Utilities

The framework provides several exported utilities for advanced waiting and polling:

```javascript
import { test, sleep, poll, waitForAssertion, waitUntil, waitForStable } from '@drownek/paperwright';

test('advanced waiting', async ({ player }) => {
  // Sleep for 1 second
  await sleep(1000);

  // Wait until a condition remains continuously true for 2 seconds
  await waitForStable(() => player.bot.health === 20, { duration: 2000, timeout: 5000 });
});
```

## Best Practices

1. **Keep tests isolated** - Each test gets a fresh bot
2. **Use descriptive names** - Make test failures easy to understand
3. **Wait for conditions** - Use assertions that auto-retry
4. **Test one thing** - Each test should verify one behavior
5. **Check server logs** - They appear in console during test runs
6. **Add delays when needed** - Use the exported `sleep(ms)` helper for timing-dependent tests

## Tips

- Tests run sequentially, not in parallel
- Server starts fresh for each test run
- Bot automatically connects to the server
- Server logs are visible in the console output

## Next Steps

- [GUI Testing](GUI-Testing) - Learn how to test inventory GUIs
- [Matchers Reference](Matchers-Reference) - Explore all available assertions
- [Examples](Examples) - See more real-world examples

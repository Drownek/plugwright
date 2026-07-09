# @drownek/plugwright

End-to-end testing runner for Paper/Spigot Minecraft plugins.

## Installation

```bash
npm install @drownek/plugwright
```

## Quick Start

```javascript
import { test, expect } from '@drownek/plugwright';

test('player can join server', async ({ player }) => {
  player.chat('/help');
  await expect(player).toHaveReceivedMessage('Available commands');
});

test('player can interact with GUI', async ({ player }) => {
    await player.makeOp();
    player.chat('/staffactivity view');

    // Get a live handle to the GUI
    const gui = await player.gui({ title: /Staff activity/ });

    // Create a locator for items
    const messageItem = gui.locator(i => i.hasLore('messages'));

    // Expectations automatically retry
    await expect(messageItem).toHaveLore('messages');
});
```

## Documentation

Full documentation is available in the [GitHub repository Wiki](https://github.com/Drownek/plugwright/wiki).

## License

MIT

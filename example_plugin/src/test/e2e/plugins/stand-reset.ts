import { definePlugin, expect } from '@plugwright/runner';

/** What a fresh account starts with, per ExamplePlugin's own default. */
const STARTING_BALANCE = 1000;

/**
 * Undoes what one test leaves on a leased account before the next test gets it.
 *
 * The local environment never needs this: it hands every test a brand new username on a
 * server it just created. An external stand has neither — the same four accounts come back
 * around all run, still opped, still holding whatever the last test gave them.
 *
 * Everything reset here is state the plugin under test owns, which is why this lives in the
 * example project rather than in the runner: only the suite knows what "back to the start"
 * means for the plugin it tests, and what commands say it.
 *
 * Loaded through `plugins { local(...) }` in build.gradle.kts, for the "stand" environment
 * only.
 */
export default definePlugin({
    name: 'stand-reset',

    async beforeEach({ player, server }) {
        await player.deOp();
        await player.clearInventory();

        const ecoOutput = await server.execute(`eco set ${player.username} ${STARTING_BALANCE}`);
        expect(ecoOutput).toContain(`Set balance of ${player.username} to $${STARTING_BALANCE}`);

        const kitOutput = await server.execute(`kit reset ${player.username}`);
        expect(kitOutput).toContain(`Kit cooldown reset for ${player.username}`);
    },
});

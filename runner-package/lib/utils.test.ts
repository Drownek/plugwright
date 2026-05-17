import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { sleep, poll, waitForAssertion, waitUntil, waitForStable } from './utils.js';

describe('utils', () => {
    describe('sleep', () => {
        it('should resolve after timeout', async () => {
            const start = Date.now();
            await sleep(50);
            assert.ok(Date.now() - start >= 45);
        });

        it('should abort if signal is aborted', async () => {
            const controller = new AbortController();
            controller.abort();
            await assert.rejects(sleep(50, controller.signal), /Aborted/);
        });
    });

    describe('poll', () => {
        it('should return value when defined', async () => {
            let count = 0;
            const res = await poll(() => {
                count++;
                if (count === 3) return 'done';
                return undefined;
            }, { interval: 10 });
            assert.strictEqual(res, 'done');
            assert.strictEqual(count, 3);
        });

        it('should throw on timeout', async () => {
            await assert.rejects(
                poll(() => undefined, { timeout: 50, interval: 10 }),
                /Timeout: poll\(\) timed out/
            );
        });
    });

    describe('waitForAssertion', () => {
        it('should pass when assertion passes', async () => {
            let count = 0;
            await waitForAssertion(async () => {
                count++;
                if (count < 3) throw new Error('Not yet');
            }, { interval: 10, timeout: 100 });
            assert.strictEqual(count, 3);
        });

        it('should throw last error on timeout', async () => {
            await assert.rejects(
                waitForAssertion(async () => { throw new Error('Failed assertion'); }, { interval: 10, timeout: 50 }),
                /Failed assertion/
            );
        });
    });

    describe('waitUntil', () => {
        it('should resolve when condition is true', async () => {
            let count = 0;
            await waitUntil(() => {
                count++;
                return count === 3;
            }, { interval: 10 });
            assert.strictEqual(count, 3);
        });

        it('should throw on timeout', async () => {
            await assert.rejects(
                waitUntil(() => false, { interval: 10, timeout: 50 }),
                /waitUntil timed out: condition was not met/
            );
        });
    });

    describe('waitForStable', () => {
        it('should pass if stable for duration', async () => {
            let count = 0;
            await waitForStable(() => {
                count++;
                return count >= 2;
            }, { interval: 10, duration: 50, timeout: 200 });
            assert.ok(count >= 2);
        });

        it('should throw if it becomes unstable', async () => {
            let count = 0;
            await assert.rejects(
                waitForStable(() => {
                    count++;
                    return count < 4; // Will become false eventually
                }, { interval: 10, duration: 100, timeout: 200 }),
                /waitForStable: condition was not stable for the required duration/
            );
        });
    });
});

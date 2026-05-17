import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sleep, poll, waitForAssertion, waitUntil, waitForStable } from '../utils.js';

describe('utils', () => {
    describe('sleep', () => {
        it('should sleep for the specified duration', async () => {
            const start = Date.now();
            await sleep(100);
            const duration = Date.now() - start;
            assert.ok(duration >= 90, `Expected duration to be at least 100ms, got ${duration}ms`);
        });

        it('should abort when signal is triggered', async () => {
            const controller = new AbortController();
            const promise = sleep(1000, controller.signal);
            controller.abort();
            await assert.rejects(promise, { message: 'Aborted' });
        });
    });

    describe('poll', () => {
        it('should return result when fn returns non-undefined', async () => {
            let calls = 0;
            const result = await poll(() => {
                calls++;
                return calls === 3 ? 'success' : undefined;
            }, { interval: 10 });
            assert.strictEqual(result, 'success');
            assert.strictEqual(calls, 3);
        });

        it('should timeout if condition is never met', async () => {
            await assert.rejects(
                poll(() => undefined, { timeout: 100, interval: 10, message: 'custom timeout' }),
                { message: 'Timeout: custom timeout' }
            );
        });
    });

    describe('waitForAssertion', () => {
        it('should resolve when assertion passes', async () => {
            let calls = 0;
            await waitForAssertion(async () => {
                calls++;
                if (calls < 3) throw new Error('fail');
            }, { interval: 10 });
            assert.strictEqual(calls, 3);
        });

        it('should throw last error on timeout', async () => {
            await assert.rejects(
                waitForAssertion(async () => { throw new Error('persistent fail'); }, { timeout: 100, interval: 10 }),
                { message: 'persistent fail' }
            );
        });
    });

    describe('waitUntil', () => {
        it('should resolve when predicate returns true', async () => {
            let calls = 0;
            await waitUntil(async () => {
                calls++;
                return calls === 3;
            }, { interval: 10 });
            assert.strictEqual(calls, 3);
        });
    });

    describe('waitForStable', () => {
        it('should resolve when condition remains true for duration', async () => {
            const start = Date.now();
            await waitForStable(() => true, { duration: 200, interval: 50 });
            const elapsed = Date.now() - start;
            assert.ok(elapsed >= 200);
        });

        it('should fail if condition becomes false during stability window', async () => {
            let calls = 0;
            await assert.rejects(
                waitForStable(() => {
                    calls++;
                    return calls < 5; // Fails after a few checks
                }, { duration: 500, interval: 50 }),
                { message: /condition was not stable/ }
            );
        });
    });
});

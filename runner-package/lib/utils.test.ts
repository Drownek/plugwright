import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sleep, poll, waitForAssertion, waitUntil, waitForStable } from './utils';

describe('utils', () => {
    describe('sleep', () => {
        it('should resolve after the specified time', async () => {
            const start = Date.now();
            await sleep(10);
            const end = Date.now();
            expect(end - start).toBeGreaterThanOrEqual(10);
        });

        it('should reject if aborted', async () => {
            const controller = new AbortController();
            const promise = sleep(100, controller.signal);
            controller.abort();
            await expect(promise).rejects.toThrow('Aborted');
        });

        it('should reject if signal is already aborted', async () => {
            const controller = new AbortController();
            controller.abort();
            await expect(sleep(100, controller.signal)).rejects.toThrow('Aborted');
        });
    });

    describe('poll', () => {
        it('should return value when fn returns non-undefined', async () => {
            let count = 0;
            const fn = vi.fn(() => {
                count++;
                return count === 3 ? 'success' : undefined;
            });

            const result = await poll(fn, { interval: 1 });
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should timeout if condition is never met', async () => {
            const fn = vi.fn(() => undefined);
            await expect(poll(fn, { timeout: 20, interval: 5 })).rejects.toThrow('Timeout: poll() timed out');
        });

        it('should throw custom timeout message', async () => {
            const fn = vi.fn(() => undefined);
            await expect(poll(fn, { timeout: 10, interval: 1, message: 'Custom Error' })).rejects.toThrow('Timeout: Custom Error');
        });

        it('should throw custom timeout message from function', async () => {
            const fn = vi.fn(() => undefined);
            await expect(poll(fn, { timeout: 10, interval: 1, message: () => 'Dynamic Error' })).rejects.toThrow('Timeout: Dynamic Error');
        });

        it('should respect AbortSignal', async () => {
            const controller = new AbortController();
            const fn = vi.fn(() => undefined);
            const promise = poll(fn, { timeout: 100, interval: 1, signal: controller.signal });
            controller.abort();
            await expect(promise).rejects.toThrow('Aborted');
        });
    });

    describe('waitForAssertion', () => {
        it('should resolve when assertion passes', async () => {
            let count = 0;
            const fn = vi.fn(async () => {
                count++;
                if (count < 3) throw new Error('Not yet');
            });

            await waitForAssertion(fn, { interval: 1 });
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should throw the last error on timeout', async () => {
            const fn = vi.fn(async () => {
                throw new Error('Persistent failure');
            });
            await expect(waitForAssertion(fn, { timeout: 20, interval: 5 })).rejects.toThrow('Persistent failure');
        });

        it('should respect AbortSignal', async () => {
            const controller = new AbortController();
            const fn = vi.fn(async () => {
                throw new Error('Fail');
            });
            const promise = waitForAssertion(fn, { timeout: 100, interval: 1, signal: controller.signal });
            controller.abort();
            await expect(promise).rejects.toThrow('Aborted');
        });
    });

    describe('waitUntil', () => {
        it('should resolve when predicate returns true', async () => {
            let count = 0;
            const predicate = vi.fn(() => {
                count++;
                return count === 3;
            });

            await waitUntil(predicate, { interval: 1 });
            expect(predicate).toHaveBeenCalledTimes(3);
        });

        it('should timeout if predicate never returns true', async () => {
            const predicate = vi.fn(() => false);
            await expect(waitUntil(predicate, { timeout: 20, interval: 5 })).rejects.toThrow('waitUntil timed out: condition was not met');
        });

        it('should respect AbortSignal', async () => {
            const controller = new AbortController();
            const predicate = vi.fn(() => false);
            const promise = waitUntil(predicate, { timeout: 100, interval: 1, signal: controller.signal });
            controller.abort();
            await expect(promise).rejects.toThrow('Aborted');
        });
    });

    describe('waitForStable', () => {
        it('should resolve if condition stays true for duration', async () => {
            const predicate = vi.fn(() => true);
            await waitForStable(predicate, { duration: 20, interval: 5 });
            expect(predicate).toHaveBeenCalled();
        });

        it('should wait until condition becomes true before checking stability', async () => {
            let count = 0;
            const predicate = vi.fn(() => {
                count++;
                return count >= 3;
            });
            await waitForStable(predicate, { duration: 10, interval: 2, timeout: 50 });
            expect(count).toBeGreaterThanOrEqual(3);
        });

        it('should throw if condition becomes false during stability window', async () => {
            let count = 0;
            const predicate = vi.fn(() => {
                count++;
                if (count < 3) return true; // Initial true
                if (count === 4) return false; // Fail stability
                return true;
            });
            await expect(waitForStable(predicate, { duration: 100, interval: 1 })).rejects.toThrow('waitForStable: condition was not stable for the required duration');
        });

        it('should timeout if condition never becomes true', async () => {
            const predicate = vi.fn(() => false);
            await expect(waitForStable(predicate, { timeout: 20, interval: 5 })).rejects.toThrow('waitForStable: condition was not stable for the required duration');
        });

        it('should respect AbortSignal', async () => {
            const controller = new AbortController();
            const predicate = vi.fn(() => false);
            const promise = waitForStable(predicate, { timeout: 100, interval: 1, signal: controller.signal });
            controller.abort();
            await expect(promise).rejects.toThrow('Aborted');
        });
    });
});

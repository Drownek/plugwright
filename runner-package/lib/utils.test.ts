import { describe, it, expect, vi } from 'vitest';
import { sleep, poll, waitForAssertion, waitUntil, waitForStable } from './utils.js';

describe('utils', () => {
    describe('sleep', () => {
        it('resolves after the specified time', async () => {
            const start = Date.now();
            await sleep(100);
            const duration = Date.now() - start;
            expect(duration).toBeGreaterThanOrEqual(90);
        });

        it('rejects if AbortSignal is already aborted', async () => {
            const controller = new AbortController();
            controller.abort();
            await expect(sleep(100, controller.signal)).rejects.toThrow('Aborted');
        });

        it('rejects if AbortSignal is aborted during sleep', async () => {
            const controller = new AbortController();
            const promise = sleep(1000, controller.signal);
            setTimeout(() => controller.abort(), 50);
            await expect(promise).rejects.toThrow('Aborted');
        });
    });

    describe('poll', () => {
        it('returns result when fn returns non-undefined', async () => {
            let count = 0;
            const fn = vi.fn(() => {
                count++;
                return count === 3 ? 'success' : undefined;
            });
            const result = await poll(fn, { interval: 10 });
            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('times out if result is never non-undefined', async () => {
            const fn = () => undefined;
            await expect(poll(fn, { timeout: 100, interval: 10 })).rejects.toThrow('Timeout: poll() timed out');
        });

        it('uses custom message on timeout', async () => {
            const fn = () => undefined;
            await expect(poll(fn, { timeout: 10, message: 'custom error' })).rejects.toThrow('Timeout: custom error');
        });

        it('stops polling when signal is aborted', async () => {
            const controller = new AbortController();
            const fn = vi.fn(() => undefined);
            const promise = poll(fn, { timeout: 1000, interval: 10, signal: controller.signal });
            setTimeout(() => controller.abort(), 50);
            await expect(promise).rejects.toThrow('Aborted');
        });
    });

    describe('waitForAssertion', () => {
        it('resolves when assertion passes', async () => {
            let count = 0;
            const fn = vi.fn(async () => {
                count++;
                if (count < 3) throw new Error('fail');
            });
            await waitForAssertion(fn, { interval: 10 });
            expect(count).toBe(3);
        });

        it('throws last error on timeout', async () => {
            const fn = async () => { throw new Error('persistent fail'); };
            await expect(waitForAssertion(fn, { timeout: 100, interval: 10 })).rejects.toThrow('persistent fail');
        });
    });

    describe('waitUntil', () => {
        it('resolves when predicate returns true', async () => {
            let count = 0;
            const predicate = vi.fn(() => {
                count++;
                return count === 3;
            });
            await waitUntil(predicate, { interval: 10 });
            expect(count).toBe(3);
        });

        it('throws on timeout', async () => {
            const predicate = () => false;
            await expect(waitUntil(predicate, { timeout: 100, interval: 10 })).rejects.toThrow('waitUntil timed out');
        });
    });

    describe('waitForStable', () => {
        it('resolves if condition stays true for duration', async () => {
            const predicate = vi.fn(() => true);
            await waitForStable(predicate, { duration: 100, interval: 20 });
            expect(predicate).toHaveBeenCalled();
        });

        it('waits for initial truthiness then checks stability', async () => {
            let count = 0;
            const predicate = vi.fn(() => {
                count++;
                return count > 2;
            });
            await waitForStable(predicate, { duration: 100, interval: 20, timeout: 500 });
            expect(count).toBeGreaterThan(2);
        });

        it('throws if condition becomes false during stability window', async () => {
            let count = 0;
            const predicate = vi.fn(() => {
                count++;
                // true for first 3 calls, then false
                return count <= 3;
            });
            await expect(waitForStable(predicate, { duration: 500, interval: 20 })).rejects.toThrow('waitForStable: condition was not stable');
        });
    });
});

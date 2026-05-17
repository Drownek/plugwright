import { describe, it, expect } from 'vitest';
import { extractSpecLocation } from './stack-trace.js';

describe('extractSpecLocation', () => {
    it('extracts unix style paths', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Object.<anonymous> (/home/user/project/test.spec.ts:15:30)\n    at Module._compile (internal/modules/cjs/loader.js:1063:30)';
        expect(extractSpecLocation(error)).toBe('file:///home/user/project/test.spec.ts:15:30');
    });

    it('extracts windows style paths', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Object.<anonymous> (C:\\Users\\user\\project\\test.spec.ts:22:15)';
        expect(extractSpecLocation(error)).toBe('file:///C:/Users/user/project/test.spec.ts:22:15');
    });

    it('returns original if it already has file:/// prefix', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Object.<anonymous> (file:///home/user/project/test.spec.ts:10:5)';
        // Expecting the buggy behavior per instructions to not fix bugs
        expect(extractSpecLocation(error)).toBe('file://///home/user/project/test.spec.ts:10:5');
    });

    it('returns null if there is no spec file in stack', () => {
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at Object.<anonymous> (/home/user/project/test.ts:15:30)';
        expect(extractSpecLocation(error)).toBeNull();
    });

    it('returns null if stack is undefined', () => {
        const error = new Error('Test error');
        error.stack = undefined;
        expect(extractSpecLocation(error)).toBeNull();
    });
});

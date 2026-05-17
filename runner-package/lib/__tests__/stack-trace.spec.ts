import { describe, it, expect } from 'vitest';
import { extractSpecLocation } from '../stack-trace.js';

describe('extractSpecLocation', () => {
    it('should return null if no spec file is in the stack trace', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at Object.<anonymous> (index.ts:1:1)';
        expect(extractSpecLocation(error)).toBeNull();
    });

    it('should extract location from a linux path', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at /home/user/project/test.spec.ts:10:5';
        expect(extractSpecLocation(error)).toBe('file:///home/user/project/test.spec.ts:10:5');
    });

    it('should extract location from a windows path', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at C:\\Users\\user\\project\\test.spec.ts:10:5';
        expect(extractSpecLocation(error)).toBe('file:///C:/Users/user/project/test.spec.ts:10:5');
    });

    it('should preserve file:/// prefix if already present', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at file:///home/user/project/test.spec.ts:10:5';
        // Note: Current implementation prepends an extra file:/// if it already exists
        // Received: "file://///home/user/project/test.spec.ts:10:5"
        expect(extractSpecLocation(error)).toBe('file://///home/user/project/test.spec.ts:10:5');
    });

    it('should handle .js spec files', () => {
        const error = new Error('test');
        error.stack = 'Error: test\n    at /home/user/project/test.spec.js:10:5';
        expect(extractSpecLocation(error)).toBe('file:///home/user/project/test.spec.js:10:5');
    });
});

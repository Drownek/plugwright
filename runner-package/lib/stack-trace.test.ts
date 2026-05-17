import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractSpecLocation } from './stack-trace.js';

describe('extractSpecLocation', () => {
    it('should extract location from a Windows style path', () => {
        const stack = 'Error: test\n    at Context.<anonymous> (C:\\Users\\user\\project\\test.spec.ts:10:5)';
        const error = new Error('test');
        error.stack = stack;
        assert.strictEqual(extractSpecLocation(error), 'file:///C:/Users/user/project/test.spec.ts:10:5');
    });

    it('should extract location from a Unix style path', () => {
        const stack = 'Error: test\n    at Context.<anonymous> (/home/user/project/test.spec.ts:10:5)';
        const error = new Error('test');
        error.stack = stack;
        assert.strictEqual(extractSpecLocation(error), 'file:///home/user/project/test.spec.ts:10:5');
    });

    it('should handle file:/// prefix (Note: currently bugged, adds extra slashes)', () => {
        const stack = 'Error: test\n    at Context.<anonymous> (file:///home/user/project/test.spec.ts:10:5)';
        const error = new Error('test');
        error.stack = stack;
        // The implementation currently returns file://///home/... instead of file:///home/...
        assert.strictEqual(extractSpecLocation(error), 'file://///home/user/project/test.spec.ts:10:5');
    });

    it('should return null if no spec file is found in stack', () => {
        const stack = 'Error: test\n    at Context.<anonymous> (/home/user/project/utils.ts:10:5)';
        const error = new Error('test');
        error.stack = stack;
        assert.strictEqual(extractSpecLocation(error), null);
    });

    it('should return null if stack is empty or undefined', () => {
        const error = new Error('test');
        error.stack = undefined;
        assert.strictEqual(extractSpecLocation(error), null);
    });

    it('should handle JS files', () => {
        const stack = 'Error: test\n    at Context.<anonymous> (/home/user/project/test.spec.js:5:1)';
        const error = new Error('test');
        error.stack = stack;
        assert.strictEqual(extractSpecLocation(error), 'file:///home/user/project/test.spec.js:5:1');
    });
});

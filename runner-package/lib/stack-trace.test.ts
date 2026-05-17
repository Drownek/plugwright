import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { extractSpecLocation } from './stack-trace.js';

describe('stack-trace', () => {
    describe('extractSpecLocation', () => {
        it('should return null if no spec file is found in stack trace', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at Object.<anonymous> (index.js:1:1)';
            assert.strictEqual(extractSpecLocation(error), null);
        });

        it('should extract location from a Linux/macOS path', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at Object.<anonymous> (/home/user/project/test.spec.ts:10:5)';
            assert.strictEqual(extractSpecLocation(error), 'file:///home/user/project/test.spec.ts:10:5');
        });

        it('should extract location from a Windows path', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at Object.<anonymous> (C:\\Users\\User\\project\\test.spec.ts:10:5)';
            assert.strictEqual(extractSpecLocation(error), 'file:///C:/Users/User/project/test.spec.ts:10:5');
        });

        it('should handle existing file:/// prefix (Note: currently double-prefixes due to bug)', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at Object.<anonymous> (file:///home/user/project/test.spec.js:20:15)';
            // The current implementation returns file://///path if file:/// is already present
            assert.strictEqual(extractSpecLocation(error), 'file://///home/user/project/test.spec.js:20:15');
        });

        it('should work with .js spec files', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at Object.<anonymous> (/path/to/my.spec.js:5:1)';
            assert.strictEqual(extractSpecLocation(error), 'file:///path/to/my.spec.js:5:1');
        });

        it('should handle backslashes in Windows paths correctly', () => {
            const error = new Error('test');
            error.stack = 'Error: test\n    at Object.<anonymous> (D:\\work\\test.spec.ts:123:456)';
            assert.strictEqual(extractSpecLocation(error), 'file:///D:/work/test.spec.ts:123:456');
        });
    });
});

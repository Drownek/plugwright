import type { Environment } from './environment.js';
import type { RequiresMap } from './test-registry.js';

/** Capability keys from a `requires` map that `env` does not actually satisfy. A value of
 *  `false`, `'none'`, or an absent key all count as unmet.
 *
 *  `{ consoleOutput: 'full' }` demands one specific value instead — for a test that
 *  reads the server log, which a console answering only its own commands cannot provide even
 *  though it satisfies plain `console: true`. */
export function missingCapabilities(env: Environment, required: RequiresMap): string[] {
    if (Array.isArray(required)) {
        throw new Error('Test "requires" must be an object map (e.g. { requires: { console: true } }), not an array.');
    }
    const capabilities = (env?.capabilities ?? {}) as unknown as Record<string, unknown>;
    const missing: string[] = [];
    for (const [key, expectedValue] of Object.entries(required ?? {})) {
        if (expectedValue === undefined) continue;
        const actualValue = capabilities[key];
        
        if (expectedValue === true) {
            if (actualValue === false || actualValue === 'none' || actualValue == null) {
                missing.push(key);
            }
        } else if (expectedValue === false) {
            if (actualValue !== false && actualValue !== 'none' && actualValue != null) {
                missing.push(`!${key}`);
            }
        } else {
            if (String(actualValue) !== String(expectedValue)) {
                missing.push(`${key}:${expectedValue}`);
            }
        }
    }
    return missing;
}

/** The two `TestOptions` fields a test itself declares — `environments` and `requires` —
 *  checked against the running environment. Name filters (`tests.names`/`exclude`) stay local
 *  to `runFile`: they're a run-level concern, not part of what a test declares. */
export function skipReasonForOptions(
    env: Environment,
    environmentName: string,
    requires: RequiresMap,
    environments: string[] | null,
): string | null {
    if (environments && !environments.includes(environmentName)) {
        return `requires environment in [${environments.join(', ')}], running "${environmentName}"`;
    }
    const missing = missingCapabilities(env, requires);
    if (missing.length > 0) {
        return `requires capability [${missing.join(', ')}], unavailable on "${environmentName}"`;
    }
    return null;
}

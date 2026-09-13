import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import pc from 'picocolors';
import { extractSpecLocation } from './stack-trace.js';
import type { TestResult } from './types.js';

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
}

function statusOf(result: TestResult): 'PASS' | 'FAIL' | 'SKIP' {
    if (result.skipped) return 'SKIP';
    return result.passed ? 'PASS' : 'FAIL';
}

type Instances = NonNullable<TestResult['instances']>;

/** The instances that actually ran the test. A skipped instance carries `durationMs: 0` and no
 *  outcome of its own, so counting it as a pass overstates how many bots got through and its
 *  zero drags every duration statistic down. */
function ranInstances(instances: Instances): Instances {
    return instances.filter(i => !i.skipped);
}

/** min/avg/max duration across a `concurrency > 1` result's instances that ran. */
function instanceStats(instances: Instances): { min: number; avg: number; max: number } {
    const durations = instances.map(i => i.durationMs);
    return {
        min: Math.min(...durations),
        avg: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
        max: Math.max(...durations),
    };
}

export function printTestSummary(testResults: TestResult[]): number {
    console.log(`\n${pc.bold("=".repeat(40))}`);
    console.log(pc.bold('  Test Summary'));
    console.log(pc.bold("=".repeat(40)));

    const skipped = testResults.filter(r => r.skipped);
    const executed = testResults.filter(r => !r.skipped);
    const passed = executed.filter(r => r.passed);
    const failed = executed.filter(r => !r.passed);
    const totalDuration = testResults.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(`  Total:    ${pc.bold(String(testResults.length))}`);
    console.log(`  Passed:   ${pc.green(pc.bold(String(passed.length)))}`);
    console.log(`  Failed:   ${failed.length > 0 ? pc.red(pc.bold(String(failed.length))) : pc.dim(String(failed.length))}`);
    // A test row only counts as skipped when every one of its concurrent instances skipped it,
    // so under `concurrency: N` a block that stops early on some bots leaves "Skipped: 0" while
    // dozens of instances never ran. Count those too rather than let them disappear.
    const skippedInstances = testResults.reduce(
        (sum, r) => sum + (r.instances?.filter(i => i.skipped).length ?? 0),
        0,
    );
    const instanceNote = skippedInstances > 0 ? pc.dim(` (${skippedInstances} concurrent instances)`) : '';
    console.log(`  Skipped:  ${skipped.length > 0 ? pc.yellow(pc.bold(String(skipped.length))) : pc.dim(String(skipped.length))}${instanceNote}`);
    console.log(`  Duration: ${pc.dim(formatDuration(totalDuration))}`);

    const statusCol = 'Status';
    const testCol = 'Test';
    const durationCol = 'Duration';

    const statusWidth = Math.max(statusCol.length, ...testResults.map(r => statusOf(r).length));
    const durationWidth = Math.max(durationCol.length, ...testResults.map(r => formatDuration(r.durationMs).length));
    const testWidth = Math.max(testCol.length, ...testResults.map(r => r.testName.length));

    const header = `  ${pc.dim(`${statusCol.padEnd(statusWidth)}  ${testCol.padEnd(testWidth)}  ${durationCol.padStart(durationWidth)}`)}`;
    const separator = `  ${pc.dim(`${"-".repeat(statusWidth)}  ${"-".repeat(testWidth)}  ${"-".repeat(durationWidth)}`)}`;

    console.log(`\n${header}`);
    console.log(separator);

    for (const result of testResults) {
        const status = statusOf(result);
        const statusPadded = status.padEnd(statusWidth);
        const coloredStatus = status === 'PASS'
            ? pc.green(pc.bold(statusPadded))
            : status === 'SKIP'
                ? pc.yellow(pc.bold(statusPadded))
                : pc.red(pc.bold(statusPadded));
        const duration = formatDuration(result.durationMs);
        // A concurrent test/block's row is one aggregate over N instances — say how many
        // passed right in the table, not just in the failed-tests detail below. The ratio is
        // over the instances that ran, with the skipped ones counted separately: reading
        // "[8/10]" when two of those ten never reached this test is worse than reading nothing.
        const instanceTag = result.instances ? (() => {
            const ran = ranInstances(result.instances!);
            const skippedCount = result.instances!.length - ran.length;
            const skipNote = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
            return pc.dim(` [${ran.filter(i => i.passed).length}/${ran.length}${skipNote}]`);
        })() : '';
        console.log(`  ${coloredStatus}  ${result.testName.padEnd(testWidth)}  ${pc.dim(duration.padStart(durationWidth))}${instanceTag}`);
    }

    console.log(separator);
    console.log(`  ${''.padEnd(statusWidth)}  ${pc.bold('Total'.padEnd(testWidth))}  ${pc.dim(formatDuration(totalDuration).padStart(durationWidth))}`);

    if (skipped.length > 0) {
        console.log(`\n${pc.yellow(pc.bold('Skipped Tests:'))}\n`);
        for (const result of skipped) {
            console.log(`  ${pc.yellow(`- ${result.testName}`)}`);
            if (result.skipReason) console.log(`    ${pc.dim(result.skipReason)}`);
        }
    }

    if (failed.length > 0) {
        console.log(`\n${pc.red(pc.bold('Failed Tests:'))}\n`);

        for (const result of failed) {
            console.log(`  ${pc.red(`x ${result.testName}`)}`);

            if (result.error) {
                console.log(`    ${pc.red(result.error.message)}`);
                const location = extractSpecLocation(result.error);
                if (location) {
                    console.log(`    ${pc.dim(`at ${location}`)}`);
                }
            }

            if (result.instances) {
                const ran = ranInstances(result.instances);
                const skippedCount = result.instances.length - ran.length;
                const skipNote = skippedCount > 0 ? `, ${skippedCount} skipped` : '';
                if (ran.length > 0) {
                    const { min, avg, max } = instanceStats(ran);
                    console.log(`    ${pc.dim(`${ran.length} instances ran${skipNote}: min ${formatDuration(min)} / avg ${formatDuration(avg)} / max ${formatDuration(max)}`)}`);
                } else {
                    console.log(`    ${pc.dim(`0 instances ran${skipNote}`)}`);
                }
                for (const instance of result.instances) {
                    const tag = `[${instance.index}/${result.instances.length}]`;
                    const label = instance.botUsername ?? '?';
                    const status = instance.skipped
                        ? pc.yellow('SKIP')
                        : instance.passed ? pc.green('OK') : pc.red('FAIL');
                    const detail = instance.skipped
                        ? pc.dim(instance.skipReason ? ` ${instance.skipReason}` : '')
                        : instance.error ? pc.red(` ${instance.error.message}`) : '';
                    // A skip has no duration of its own, so printing "(0ms)" next to it reads
                    // as an instant pass — the exact confusion this branch exists to remove.
                    const timing = instance.skipped ? '' : ` ${pc.dim(`(${formatDuration(instance.durationMs)})`)}`;
                    console.log(`      ${pc.dim(`- ${tag} ${label}:`)} ${status}${timing}${detail}`);
                }
            }

            console.log('');
        }

        return 1;
    } else {
        console.log(`\n${pc.green(pc.bold('All tests passed!'))}`);
        return 0;
    }
}

function xmlEscape(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Writes the machine-readable report a matrix run aggregates across environments. */
export function writeJsonReport(path: string, environmentName: string, testResults: TestResult[]): void {
    const skipped = testResults.filter(r => r.skipped);
    const executed = testResults.filter(r => !r.skipped);
    const passed = executed.filter(r => r.passed);
    const failed = executed.filter(r => !r.passed);
    const durationMs = testResults.reduce((sum, r) => sum + r.durationMs, 0);

    const report = {
        environment: environmentName,
        summary: {
            total: testResults.length,
            passed: passed.length,
            failed: failed.length,
            skipped: skipped.length,
            // Instance-level skips, which `skipped` above cannot show: a test row is only
            // skipped when all of its concurrent instances were.
            skippedInstances: testResults.reduce(
                (sum, r) => sum + (r.instances?.filter(i => i.skipped).length ?? 0),
                0,
            ),
            durationMs,
        },
        tests: testResults.map(r => ({
            file: r.file,
            name: r.testName,
            status: statusOf(r).toLowerCase(),
            durationMs: r.durationMs,
            error: r.error ? r.error.message : null,
            skipReason: r.skipReason ?? null,
            plugin: r.plugin ?? null,
            botUsername: r.botUsername ?? null,
            // Present when this row aggregates a `concurrency > 1` test/block: every instance's
            // own outcome, so a failure names which bot lost the race instead of just that one did.
            instances: r.instances
                ? r.instances.map(i => ({
                    index: i.index,
                    botUsername: i.botUsername ?? null,
                    passed: i.passed,
                    durationMs: i.durationMs,
                    error: i.error ? i.error.message : null,
                    skipped: !!i.skipped,
                    skipReason: i.skipReason ?? null,
                }))
                : null,
        })),
    };

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(report, null, 2), 'utf8');
}

/** Writes a JUnit XML report: `testsuite name="plugwright.<env>"`, one `testcase` per test,
 *  spec file as `classname`, full `describe`-chain name as `name`. */
export function writeJUnitReport(path: string, environmentName: string, testResults: TestResult[]): void {
    const skipped = testResults.filter(r => r.skipped).length;
    const failed = testResults.filter(r => !r.skipped && !r.passed).length;
    const totalTimeSeconds = (testResults.reduce((sum, r) => sum + r.durationMs, 0) / 1000).toFixed(3);

    const cases = testResults.map(r => {
        const timeSeconds = (r.durationMs / 1000).toFixed(3);
        const classname = xmlEscape(r.file);
        const name = xmlEscape(r.testName);
        const pluginAttr = r.plugin ? ` plugin="${xmlEscape(r.plugin)}"` : '';
        const inner = r.skipped
            ? `\n    <skipped message="${xmlEscape(r.skipReason ?? 'skipped')}"/>\n  `
            : !r.passed
                ? `\n    <failure message="${xmlEscape(r.error?.message ?? 'failed')}">${xmlEscape(r.error?.stack ?? r.error?.message ?? '')}</failure>\n  `
                : '';
        return `  <testcase classname="${classname}" name="${name}" time="${timeSeconds}"${pluginAttr}>${inner}</testcase>`;
    });

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        `<testsuite name="plugwright.${xmlEscape(environmentName)}" tests="${testResults.length}" failures="${failed}" skipped="${skipped}" time="${totalTimeSeconds}">`,
        ...cases,
        '</testsuite>',
        '',
    ].join('\n');

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, xml, 'utf8');
}
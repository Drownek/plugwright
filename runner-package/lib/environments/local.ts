import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import pc from 'picocolors';
import type { Environment, EnvironmentCapabilities, BotConnectionOptions } from '../environment.js';
import type { ServerConsole } from '../console.js';
import type { LocalEnvironmentConfig } from '../config.js';
import type { Session } from '../session.js';
import { rconConsole } from '../rcon/index.js';

const CAPABILITIES: EnvironmentCapabilities = {
    console: true,
    consoleOutput: 'full',
    op: true,
};

/**
 * The mode that's been here all along: download Paper, patch configs (Gradle side),
 * spawn it, tear it down.
 *
 * Commands are sent over RCON (the same protocol external mode uses) for reliable
 * command-response correlation. The full server log is still captured via stdout/stderr
 * so `expect(server).toHaveReceivedMessage(...)` keeps working — that's what
 * `consoleOutput: 'full'` means.
 */
export class LocalEnvironment implements Environment {
    readonly id = 'local';
    readonly capabilities = CAPABILITIES;

    private readonly config: LocalEnvironmentConfig;
    private serverProcess: ChildProcessWithoutNullStreams | null = null;
    private session: Session | null = null;
    private cleanupStarted = false;
    private _rconConsole: ServerConsole | null = null;

    constructor(config: LocalEnvironmentConfig) {
        this.config = config;
    }

    async setup(session: Session): Promise<void> {
        this.session = session;

        const { serverJar, serverDir, javaPath } = this.config;
        if (!serverJar || !serverDir || !javaPath) {
            throw new Error('Environment config must provide serverJar, serverDir and javaPath');
        }

        console.log(`${pc.bold('Starting Paper server...')}`);
        const jvmArgs = this.config.jvmArgs ?? [];
        console.log(pc.dim(`JVM Arguments: ${jvmArgs.join(' ')}`));

        const serverProcess = spawn(javaPath, [...jvmArgs, '-jar', serverJar, '--nogui'], {
            cwd: serverDir,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        this.serverProcess = serverProcess;
        this._installProcessGuards(serverProcess);

        // stdout/stderr continuously feed the full console log — this is what makes
        // `consoleOutput: 'full'` true and `expect(server).toHaveReceivedMessage` work.
        serverProcess.stdout.on('data', (data: Buffer) => session.writeConsoleOutput(data));
        serverProcess.stderr.on('data', (data: Buffer) => session.writeConsoleOutput(data));
        // Ignore EPIPE if server process terminates before/during teardown stdin writes.
        serverProcess.stdin.on('error', () => { /* ignore */ });

        await this._waitForServerStart(serverProcess);
        console.log(`${pc.green(pc.bold('Server started successfully'))}\n`);

        // Connect to the local server's RCON for sending commands. RCON gives a proper
        // synchronous response per command, unlike the old stdin `/say <syncId>` trick.
        await this._connectRcon();
    }

    /**
     * Connects to the local server via RCON.
     */
    private async _connectRcon(): Promise<void> {
        const consoleInstance: ServerConsole = rconConsole({
            host: this.config.host ?? 'localhost',
            port: this.config.rconPort ?? 25575,
            password: this.config.rconPassword ?? 'plugwright',
        });

        // RCON may need a moment after the server logs "Done" — retry a few times.
        const maxAttempts = 5;
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                if (await consoleInstance.probe()) {
                    this._rconConsole = consoleInstance;
                    console.log(pc.green(`[local] RCON connected (port ${this.config.rconPort ?? 25575})`));
                    return;
                }
            } catch (error) {
                lastError = error as Error;
            }
            // Wait before retrying — RCON listener may start slightly after the game loop.
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error(
            `RCON failed to connect to the local server after ${maxAttempts} attempts. ` +
            'Make sure enable-rcon=true is set in server.properties (the Gradle plugin does ' +
            `this automatically). ${lastError ? `(${lastError.message})` : ''}`
        );
    }

    connection(): BotConnectionOptions {
        return {
            host: this.config.host ?? 'localhost',
            port: this.config.port ?? 25565,
            version: this.config.minecraftVersion ?? undefined,
            auth: 'offline',
        };
    }

    console(): ServerConsole | null {
        return this._rconConsole;
    }

    async teardown(): Promise<void> {
        if (this._rconConsole?.close) {
            await this._rconConsole.close();
        }

        const serverProcess = this.serverProcess;
        if (!serverProcess) return;

        // Send `stop` through stdin — reliable even if RCON has already disconnected.
        if (serverProcess.exitCode === null && !serverProcess.killed) {
            try {
                serverProcess.stdin.write('stop\n');
            } catch (err) {
                console.log(pc.yellow(`[WARNING] Failed to send stop command to server: ${(err as Error).message}`));
            }
        }

        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                console.log(pc.yellow('[WARNING] Server did not stop gracefully, forcing shutdown...'));
                serverProcess.kill();
                resolve();
            }, 30000);

            serverProcess.once('exit', (code) => {
                clearTimeout(timeout);
                if (code !== 0) {
                    console.log(pc.yellow(`[WARNING] Server exited with code: ${code}`));
                }
                resolve();
            });
        });

        serverProcess.removeAllListeners();
        serverProcess.stdin.end();
        serverProcess.stdout.destroy();
        serverProcess.stderr.destroy();
    }

    private _waitForServerStart(serverProcess: ChildProcessWithoutNullStreams): Promise<void> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Server failed to start within 120 seconds'));
            }, 120000);

            const dataHandler = (data: Buffer): void => {
                const output = data.toString();
                if (output.includes('Done (')) {
                    cleanup();
                    setTimeout(resolve, 3000);
                }
            };

            const errorHandler = (err: Error): void => {
                cleanup();
                reject(new Error(`Failed to start server: ${err.message}`));
            };

            const exitHandler = (code: number | null): void => {
                if (code !== null && code !== 0) {
                    cleanup();
                    reject(new Error(`Server exited with code ${code} before becoming ready`));
                }
            };

            const cleanup = (): void => {
                clearTimeout(timeout);
                serverProcess.stdout.removeListener('data', dataHandler);
                serverProcess.removeListener('error', errorHandler);
                serverProcess.removeListener('exit', exitHandler);
            };

            serverProcess.stdout.on('data', dataHandler);
            serverProcess.on('error', errorHandler);
            serverProcess.on('exit', exitHandler);
        });
    }

    /**
     * Kills the Paper process tree if our own process dies unexpectedly — Gradle task
     * cancelled from the IDE, SIGKILL from upstream, etc. Otherwise java.exe keeps
     * running and holds run/logs/latest.log open, breaking the next clean on Windows.
     */
    private _installProcessGuards(serverProcess: ChildProcessWithoutNullStreams): void {
        const killServerTree = (): void => {
            if (!serverProcess.pid || serverProcess.killed || serverProcess.exitCode !== null) return;
            try {
                if (process.platform === 'win32') {
                    // taskkill recursively kills the whole java process tree.
                    spawn('taskkill', ['/F', '/T', '/PID', String(serverProcess.pid)], {
                        stdio: 'ignore',
                        windowsHide: true,
                    }).on('error', () => { /* best effort */ });
                } else {
                    serverProcess.kill('SIGKILL');
                }
            } catch {
                /* best effort */
            }
        };

        const emergencyShutdown = (signal: string): void => {
            if (this.cleanupStarted) return;
            this.cleanupStarted = true;
            console.log(pc.yellow(`\n[runner] Received ${signal}, killing Paper server...`));
            killServerTree();
            // Give taskkill a moment, then exit.
            setTimeout(() => process.exit(1), 500).unref();
        };

        process.on('SIGINT', () => emergencyShutdown('SIGINT'));
        process.on('SIGTERM', () => emergencyShutdown('SIGTERM'));
        process.on('SIGHUP', () => emergencyShutdown('SIGHUP'));
        if (process.platform === 'win32') {
            process.on('SIGBREAK', () => emergencyShutdown('SIGBREAK'));
        }
        // Last-resort safety net: if this node process exits for any reason while
        // the server is still alive, try to take it down with us.
        process.on('exit', () => killServerTree());
        // On Windows, when the parent (Gradle) is killed abruptly, signals are not
        // delivered but our stdin pipe closes. Use that as a death signal.
        if (process.stdin && typeof process.stdin.on === 'function') {
            process.stdin.on('close', () => emergencyShutdown('stdin-close'));
            process.stdin.on('end', () => emergencyShutdown('stdin-end'));
            // stdin must be resumed for 'end'/'close' to fire on a piped stdin.
            try { process.stdin.resume(); } catch { /* ignore */ }
        }
    }
}

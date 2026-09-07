import type { ServerConsole } from '@plugwright/runner';
import { RconConnection } from './lib/rcon-connection.js';

export interface RconConsoleConfig {
    host: string;
    port: number;
    password: string;
}

/**
 * `ServerConsole` over RCON.
 */
export function rconConsole(config: RconConsoleConfig): ServerConsole {
    const connection = new RconConnection(config.host, config.port, config.password);

    return {
        kind: 'rcon',
        output: 'responses',

        async probe(): Promise<boolean> {
            try {
                await connection.ensureConnected();
                return true;
            } catch {
                return false;
            }
        },

        async execute(cmd: string, timeoutMs: number = 5000): Promise<string> {
            return connection.executeAndWait(cmd, timeoutMs);
        },

        close(): void {
            connection.disconnect();
        }
    };
}

export { RconConnection };

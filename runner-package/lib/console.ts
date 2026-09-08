/**
 * A channel for sending admin commands to the server and reading its output.
 * e.g., RCON or stdio.
 */
export interface ServerConsole {
    readonly kind: 'stdio' | 'rcon';
    /** How much of the server's output this channel can see. Matchers must check this,
     *  not just whether a console exists, or tests silently stop working on `'responses'`/`'none'`. */
    readonly output: 'full' | 'responses' | 'none';
    probe(): Promise<boolean>;
    execute(cmd: string, timeoutMs?: number): Promise<string>;
    close?(): void | Promise<void>;
}

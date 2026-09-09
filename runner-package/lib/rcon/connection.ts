import { createConnection, Socket } from 'net';
import { PacketType, decodePacketBody, encodePacket } from './protocol.js';

interface Waiter {
    resolve: (payload: string) => void;
    reject: (error: Error) => void;
}

/**
 * One authenticated RCON connection: connects and authenticates lazily on first use,
 * reassembles the length-prefixed packet stream, and matches responses back to callers by
 * request id. Reconnects on the next call after the socket closes — an RCON server dropping
 * an idle connection is normal, not a hard failure.
 */
export class RconConnection {
    private socket: Socket | null = null;
    private connectPromise: Promise<void> | null = null;
    private inbound: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    private nextId = 1;
    private pendingAuth: Waiter | null = null;
    private readonly pending = new Map<number, Waiter>();

    constructor(
        private readonly host: string,
        private readonly port: number,
        private readonly password: string,
    ) {}

    async ensureConnected(): Promise<void> {
        if (this.connectPromise) return this.connectPromise;

        this.connectPromise = new Promise<void>((resolve, reject) => {
            const socket = createConnection({ host: this.host, port: this.port });
            this.socket = socket;

            let hasConnected = false;
            const connectTimer = setTimeout(() => {
                if (!hasConnected) {
                    socket.destroy(new Error(`RCON connection to ${this.host}:${this.port} timed out after 10000ms`));
                }
            }, 10000);

            socket.once('connect', () => {
                clearTimeout(connectTimer);
                hasConnected = true;
                socket.setNoDelay(true);
                this.pendingAuth = {
                    resolve: () => resolve(),
                    reject: (err) => reject(err),
                };
                const id = this.nextId++;
                socket.write(encodePacket(id, PacketType.AUTH, this.password));
            });

            socket.on('data', (chunk) => this.onData(chunk));

            socket.on('error', (err) => {
                clearTimeout(connectTimer);
                if (this.socket === socket) {
                    this.connectPromise = null;
                }
                if (!hasConnected) {
                    reject(err);
                }
                if (this.pendingAuth) {
                    this.pendingAuth.reject(err);
                    this.pendingAuth = null;
                }
                for (const waiter of this.pending.values()) waiter.reject(err);
                this.pending.clear();
            });

            socket.once('close', () => {
                clearTimeout(connectTimer);
                if (this.socket === socket) {
                    this.connectPromise = null;
                    this.socket = null;
                    this.inbound = Buffer.alloc(0);
                }
                const closedError = new Error('RCON connection closed');
                this.pendingAuth?.reject(closedError);
                this.pendingAuth = null;
                for (const waiter of this.pending.values()) waiter.reject(closedError);
                this.pending.clear();
            });
        });

        return this.connectPromise;
    }

    private onData(chunk: Buffer): void {
        this.inbound = this.inbound.length > 0 ? Buffer.concat([this.inbound, chunk]) : chunk;

        while (this.inbound.length >= 4) {
            const size = this.inbound.readInt32LE(0);
            if (size < 10 || size > 1024 * 1024) {
                // Invalid packet size: minimum RCON packet size is 10 (4 id + 4 type + 1 body null + 1 pad null).
                this.inbound = Buffer.alloc(0);
                break;
            }
            if (this.inbound.length < 4 + size) break;

            const body = this.inbound.subarray(4, 4 + size);
            this.inbound = this.inbound.subarray(4 + size);
            try {
                this.handlePacket(decodePacketBody(body));
            } catch (err) {
                console.error(`[rcon] Failed to decode packet: ${(err as Error).message}`);
            }
        }
    }

    private handlePacket(packet: { id: number; type: number; payload: string }): void {
        if (packet.type === PacketType.AUTH_RESPONSE && this.pendingAuth) {
            const waiter = this.pendingAuth;
            this.pendingAuth = null;
            if (packet.id === -1) {
                this.socket?.destroy();
                this.socket = null;
                this.connectPromise = null;
                this.inbound = Buffer.alloc(0);
                waiter.reject(new Error('RCON authentication failed: wrong password'));
            } else {
                waiter.resolve('');
            }
            return;
        }

        const waiter = this.pending.get(packet.id);
        if (waiter) {
            waiter.resolve(packet.payload);
        }
    }

    private _commandQueue = Promise.resolve();

    async executeAndWait(cmd: string, timeoutMs: number): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this._commandQueue = this._commandQueue.then(async () => {
                try {
                    await this.ensureConnected();
                    const socket = this.socket;
                    if (!socket) throw new Error('RCON connection is not open');

                    const id = this.nextId++;
                    
                    const result = await new Promise<string>((innerResolve, innerReject) => {
                        const timer = setTimeout(() => {
                            this.pending.delete(id);
                            innerReject(new Error(`RCON command timed out after ${timeoutMs}ms: ${cmd}`));
                        }, timeoutMs);

                        this.pending.set(id, {
                            resolve: (payload) => { clearTimeout(timer); this.pending.delete(id); innerResolve(payload); },
                            reject: (err) => { clearTimeout(timer); this.pending.delete(id); innerReject(err); },
                        });

                        socket.write(encodePacket(id, PacketType.EXECCOMMAND, cmd));
                    });
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            }).catch(() => {});
        });
    }

    execute(cmd: string, timeoutMs: number = 5000): Promise<string> {
        return this.executeAndWait(cmd, timeoutMs);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.connectPromise = null;
        this.inbound = Buffer.alloc(0);
    }
}

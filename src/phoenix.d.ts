declare module "phoenix" {
  export class Socket {
    constructor(endPoint: string, opts?: Record<string, unknown>);
    connect(): void;
    disconnect(): void;
    channel(topic: string, params?: Record<string, unknown>): Channel;
    onOpen(callback: () => void): number;
    onClose(callback: (event?: { code?: number }) => void): number;
    onError(callback: (error?: unknown) => void): number;
    isConnected(): boolean;
  }

  export class Channel {
    readonly topic: string;
    join(): Push;
    leave(): Push;
    push(event: string, payload?: Record<string, unknown>): Push;
    on<T = unknown>(event: string, callback: (payload: T) => void): number;
    off(event: string, ref?: number): void;
    isJoined(): boolean;
  }

  export class Push {
    receive<T = unknown>(
      status: string,
      callback: (response: T) => void,
    ): Push;
  }

  export class Presence {
    constructor(channel: Channel);
    onSync(callback: () => void): void;
    list<T = unknown>(
      callback?: (id: string, presence: T) => void,
    ): Record<string, T>;
  }
}

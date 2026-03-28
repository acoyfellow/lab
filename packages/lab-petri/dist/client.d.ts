/**
 * Client-side Petri interface
 *
 * Subscribe to dish state, send mutations.
 * Works from browser, connects to Durable Object via WebSocket.
 */
import type { PetriSnapshot, PetriObserver, Mutation } from './types.js';
export interface PetriClientOptions {
    /** WebSocket URL for the Petri DO */
    wsUrl: string;
    /** HTTP API URL for mutations */
    apiUrl: string;
    /** Dish identifier */
    dishId: string;
    /** Reconnect delay in ms (default: 1000) */
    reconnectDelay?: number;
}
export declare class PetriClient<TState = unknown> {
    private options;
    private ws;
    private observers;
    private currentSnapshot;
    private reconnectTimer;
    private connected;
    constructor(options: PetriClientOptions);
    /**
     * Connect to the Petri dish via WebSocket
     */
    connect(): void;
    /**
     * Disconnect from the dish
     */
    disconnect(): void;
    /**
     * Subscribe to state changes
     */
    subscribe(observer: PetriObserver<TState>): () => void;
    /**
     * Get current snapshot (async, fetches via HTTP)
     */
    getSnapshot(): Promise<PetriSnapshot<TState>>;
    /**
     * Send mutations to the dish
     * This is what Lab agents call via labDo.fetch()
     */
    mutate(mutations: Mutation[], agent?: string): Promise<PetriSnapshot<TState>>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get current snapshot (sync, may be null)
     */
    getCurrentSnapshot(): PetriSnapshot<TState> | null;
    private handleMessage;
    private notifyObservers;
    private scheduleReconnect;
}
/**
 * Create a reactive Petri store for Svelte 5
 *
 * NOTE: This requires Svelte 5 and should be used in .svelte files
 */
export declare function createPetriStore<TState>(client: PetriClient<TState>): {
    readonly snapshot: PetriSnapshot<TState> | null;
    mutate: (mutations: Mutation[], agent?: string) => Promise<PetriSnapshot<TState>>;
    disconnect: () => void;
};
/**
 * Svelte 5 runes version - use in .svelte files with $state
 */
//# sourceMappingURL=client.d.ts.map
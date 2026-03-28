/**
 * Client-side Petri interface
 *
 * Subscribe to dish state, send mutations.
 * Works from browser, connects to Durable Object via WebSocket.
 */
export class PetriClient {
    options;
    ws = null;
    observers = new Set();
    currentSnapshot = null;
    reconnectTimer = null;
    connected = false;
    constructor(options) {
        this.options = {
            reconnectDelay: 1000,
            ...options,
        };
    }
    /**
     * Connect to the Petri dish via WebSocket
     */
    connect() {
        if (this.ws?.readyState === 1)
            return; // WebSocket.OPEN
        this.ws = new WebSocket(this.options.wsUrl);
        this.ws.addEventListener('open', () => {
            console.log('[Petri] Connected to', this.options.dishId);
            this.connected = true;
        });
        this.ws.addEventListener('message', (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            }
            catch (e) {
                console.error('[Petri] Failed to parse message:', e);
            }
        });
        this.ws.addEventListener('close', () => {
            console.log('[Petri] Disconnected, reconnecting...');
            this.connected = false;
            this.scheduleReconnect();
        });
        this.ws.addEventListener('error', (error) => {
            console.error('[Petri] WebSocket error:', error);
        });
    }
    /**
     * Disconnect from the dish
     */
    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
        this.connected = false;
    }
    /**
     * Subscribe to state changes
     */
    subscribe(observer) {
        this.observers.add(observer);
        // Immediately notify with current state if available
        if (this.currentSnapshot) {
            observer(this.currentSnapshot);
        }
        // Connect if not already
        if (!this.connected && !this.ws) {
            this.connect();
        }
        // Return unsubscribe function
        return () => {
            this.observers.delete(observer);
        };
    }
    /**
     * Get current snapshot (async, fetches via HTTP)
     */
    async getSnapshot() {
        const response = await fetch(`${this.options.apiUrl}/snapshot`, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get snapshot: ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Send mutations to the dish
     * This is what Lab agents call via labDo.fetch()
     */
    async mutate(mutations, agent) {
        const response = await fetch(`${this.options.apiUrl}/mutate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dishId: this.options.dishId,
                mutations,
                agent,
            }),
        });
        const result = await response.json();
        if (!result.ok) {
            throw new Error(result.error || 'Mutation failed');
        }
        if (!result.snapshot) {
            throw new Error('No snapshot returned');
        }
        return result.snapshot;
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
    /**
     * Get current snapshot (sync, may be null)
     */
    getCurrentSnapshot() {
        return this.currentSnapshot;
    }
    handleMessage(message) {
        switch (message.type) {
            case 'snapshot':
                this.currentSnapshot = message.data;
                this.notifyObservers(message.data);
                break;
            case 'mutation':
                // Mutation notification, snapshot will follow
                break;
            case 'error':
                console.error('[Petri] Server error:', message.error);
                break;
        }
    }
    notifyObservers(snapshot) {
        for (const observer of this.observers) {
            try {
                observer(snapshot);
            }
            catch (e) {
                console.error('[Petri] Observer error:', e);
            }
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer)
            return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.options.reconnectDelay);
    }
}
/**
 * Create a reactive Petri store for Svelte 5
 *
 * NOTE: This requires Svelte 5 and should be used in .svelte files
 */
export function createPetriStore(client) {
    // Use a simple state object that works with Svelte's reactivity
    const state = {
        _snapshot: null,
        get snapshot() { return this._snapshot; },
        set snapshot(val) { this._snapshot = val; }
    };
    const unsubscribe = client.subscribe((s) => {
        state._snapshot = s;
    });
    return {
        get snapshot() { return state.snapshot; },
        mutate: client.mutate.bind(client),
        disconnect: () => {
            unsubscribe();
            client.disconnect();
        },
    };
}
/**
 * Svelte 5 runes version - use in .svelte files with $state
 */
// export function createPetriStoreSvelte5<TState>(client: PetriClient<TState>) {
//   let snapshot = $state<PetriSnapshot<TState> | null>(null);
//   
//   const unsubscribe = client.subscribe((s) => {
//     snapshot = s;
//   });
//
//   return {
//     get snapshot() { return snapshot; },
//     mutate: client.mutate.bind(client),
//     disconnect: () => {
//       unsubscribe();
//       client.disconnect();
//     },
//   };
// }

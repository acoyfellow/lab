/**
 * Client-side Petri interface
 * 
 * Subscribe to dish state, send mutations.
 * Works from browser, connects to Durable Object via WebSocket.
 */

import type { PetriSnapshot, PetriMessage, PetriObserver, Mutation } from './types.js';

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

export class PetriClient<TState = unknown> {
  private options: PetriClientOptions;
  private ws: WebSocket | null = null;
  private observers: Set<PetriObserver<TState>> = new Set();
  private currentSnapshot: PetriSnapshot<TState> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;

  constructor(options: PetriClientOptions) {
    this.options = {
      reconnectDelay: 1000,
      ...options,
    };
  }

  /**
   * Connect to the Petri dish via WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === 1) return; // WebSocket.OPEN

    this.ws = new WebSocket(this.options.wsUrl);

    this.ws.addEventListener('open', () => {
      console.log('[Petri] Connected to', this.options.dishId);
      this.connected = true;
    });

    this.ws.addEventListener('message', (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as PetriMessage<TState>;
        this.handleMessage(message);
      } catch (e) {
        console.error('[Petri] Failed to parse message:', e);
      }
    });

    this.ws.addEventListener('close', () => {
      console.log('[Petri] Disconnected, reconnecting...');
      this.connected = false;
      this.scheduleReconnect();
    });

    this.ws.addEventListener('error', (error: Event) => {
      console.error('[Petri] WebSocket error:', error);
    });
  }

  /**
   * Disconnect from the dish
   */
  disconnect(): void {
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
  subscribe(observer: PetriObserver<TState>): () => void {
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
  async getSnapshot(): Promise<PetriSnapshot<TState>> {
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
  async mutate(mutations: Mutation[], agent?: string): Promise<PetriSnapshot<TState>> {
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

    const result = await response.json() as { ok: boolean; error?: string; snapshot?: PetriSnapshot<TState> };

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
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get current snapshot (sync, may be null)
   */
  getCurrentSnapshot(): PetriSnapshot<TState> | null {
    return this.currentSnapshot;
  }

  private handleMessage(message: PetriMessage<TState>): void {
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

  private notifyObservers(snapshot: PetriSnapshot<TState>): void {
    for (const observer of this.observers) {
      try {
        observer(snapshot);
      } catch (e) {
        console.error('[Petri] Observer error:', e);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
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
export function createPetriStore<TState>(client: PetriClient<TState>) {
  // Use a simple state object that works with Svelte's reactivity
  const state = {
    _snapshot: null as PetriSnapshot<TState> | null,
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

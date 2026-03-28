/**
 * Core types for lab-petri
 * A Petri dish is a persistent, observable substrate for experiments
 */

/** A mutation operation */
export type Mutation =
  | { op: string; [key: string]: unknown }
  | { op: 'log'; message: string };

/** Schema defines what mutations are allowed and how to apply them */
export interface PetriSchema<TState = unknown> {
  /** Unique schema identifier */
  id: string;
  
  /** Allowed mutation operations */
  mutations: string[];
  
  /** Initial state factory */
  seed: () => TState;
  
  /** Apply mutations to state - user-provided reducer */
  reduce: (state: TState, mutations: Mutation[]) => TState;
}

/** Configuration for creating a Petri dish */
export interface PetriConfig<TState = unknown> {
  /** Unique dish identifier */
  id: string;
  
  /** The schema defining this dish's behavior */
  schema: PetriSchema<TState>;
  
  /** Optional initial state (overrides schema.seed) */
  initial?: TState;
  
  /** Maximum history size (default: 100) */
  maxHistory?: number;
}

/** Snapshot of dish state at a point in time */
export interface PetriSnapshot<TState = unknown> {
  /** Dish identifier */
  dishId: string;
  
  /** Current state */
  state: TState;
  
  /** Current tick (incremented each mutation batch) */
  tick: number;
  
  /** Timestamp of last mutation */
  lastUpdate: number;
  
  /** Recent log messages */
  logs: string[];
}

/** Message sent from DO to connected clients */
export type PetriMessage<TState = unknown> =
  | { type: 'snapshot'; data: PetriSnapshot<TState> }
  | { type: 'mutation'; mutations: Mutation[]; tick: number }
  | { type: 'error'; error: string };

/** Request to mutate the dish */
export interface PetriMutateRequest {
  /** Dish identifier */
  dishId: string;
  
  /** Mutations to apply */
  mutations: Mutation[];
  
  /** Optional agent identifier */
  agent?: string;
}

/** Response from mutation request */
export interface PetriMutateResponse<TState = unknown> {
  ok: boolean;
  snapshot?: PetriSnapshot<TState>;
  error?: string;
}

/** Client-side subscription callback */
export type PetriObserver<TState = unknown> = (snapshot: PetriSnapshot<TState>) => void;

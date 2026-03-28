# lab-petri Architecture

## Overview

lab-petri provides a **persistent substrate** for Lab experiments, enabling true "Kenton-style" agent inhabitation where agents manipulate live state rather than generating static outputs.

## Core Concepts

### The Problem

Traditional Lab workflows:
```
Agent generates code → Code returns value → Host applies value to state
```

This is fragile because:
- Generated code must be perfect or it fails
- State is ephemeral (lost on page refresh)
- No real-time observation of changes

### The Solution

lab-petri introduces a **Durable Object-backed substrate**:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Agent     │────▶│  Sandbox    │────▶│   PetriDish DO  │
│  (Lab)      │◄────│  (labPetri) │◄────│  (Persistent)   │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                  │
                                          ┌───────┴───────┐
                                          │    Browser    │
                                          │  (WebSocket)  │
                                          └───────────────┘
```

The agent calls `labPetri.mutate([...])` - methods on a live object, not code generation.

## Components

### 1. PetriDish (Durable Object)

**Location:** `src/durable-object.ts`

The heart of the system. Each dish is a Durable Object that:
- **Persists state** across requests, restarts, and deployments
- **Broadcasts updates** via WebSocket to all connected clients
- **Validates mutations** against a schema
- **Maintains history** of mutations and logs

```typescript
class PetriDish implements DurableObject {
  async fetch(req): Promise<Response> {
    // Handles:
    // - WebSocket upgrade (real-time sync)
    // - POST /mutate (agent mutations)
    // - GET /snapshot (current state)
    // - POST /schema (register experiment schema)
  }
}
```

### 2. PetriClient (Browser)

**Location:** `src/client.ts`

Client-side interface for connecting to dishes:

```typescript
const client = new PetriClient<GardenState>({
  wsUrl: 'wss://lab.coey.dev/petri/my-garden',
  apiUrl: 'https://lab.coey.dev/petri/my-garden',
  dishId: 'my-garden'
});

// Subscribe to real-time updates
client.subscribe(snapshot => {
  renderGarden(snapshot.state);
});

// Apply mutations (from UI or agent)
await client.mutate([
  { op: 'updateNode', id: 'fern-1', updates: { energy: 0.8 } }
]);
```

### 3. Lab Integration

**Location:** `src/lab-integration.ts`

Provides the `labPetri` binding for generated code:

```typescript
// In the sandbox, generated code can:
const state = await labPetri.getState();
await labPetri.mutate([
  { op: 'updateNode', id: 'fern-1', updates: { energy: 0.8 } },
  { op: 'log', message: 'Fern grew stronger' }
]);
```

The shim is injected into the guest template when `capabilities: ['petri']` is specified.

### 4. Schema System

Users define experiments via schemas:

```typescript
interface PetriSchema<TState> {
  id: string;                    // Schema identifier
  mutations: string[];           // Allowed operations
  seed: () => TState;            // Initial state factory
  reduce: (state, mutations) => TState;  // State reducer
}
```

Example (Garden):
```typescript
const gardenSchema: PetriSchema<GardenState> = {
  id: 'garden-v1',
  mutations: ['updateNode', 'addNode', 'removeNode', 'nextSeason', 'log'],
  seed: () => ({ plants: [], tick: 0, season: 'spring' }),
  reduce: (state, mutations) => {
    // Apply mutations immutably
    return newState;
  }
};
```

## Data Flow

### Agent Mutation Flow

```
1. Agent code runs in Lab sandbox
   ↓
2. Calls labPetri.mutate([...])
   ↓
3. Sandbox makes internal fetch to /petri/{dishId}/mutate
   ↓
4. Worker routes to PetriDish Durable Object
   ↓
5. DO validates mutations against schema
   ↓
6. DO applies mutations via reduce() function
   ↓
7. DO persists new state to storage
   ↓
8. DO broadcasts snapshot to all WebSocket clients
   ↓
9. Browser UI receives update and re-renders
```

### UI Observation Flow

```
1. Browser connects to PetriDish via WebSocket
   ↓
2. DO immediately sends current snapshot
   ↓
3. Client subscribes to state changes
   ↓
4. When mutations occur, DO broadcasts to all clients
   ↓
5. UI updates automatically
```

## Why This Matters

### Before (Traditional Lab)
```typescript
// Agent generates this code:
const result = { x: 1, y: 2 };  // Must be perfect or crashes
// Host manually applies to state
state.board[result.y][result.x] = 'O';
```

### After (lab-petri)
```typescript
// Agent generates this code:
await labPetri.mutate([
  { op: 'placeO', x: 1, y: 2 }
]);
// DO validates, applies, persists, broadcasts
```

**Key differences:**
- **Validation:** Invalid mutations are caught and rejected
- **Persistence:** State survives page reloads
- **Observability:** All clients see updates in real-time
- **Robustness:** Partial failures don't corrupt state

## Integration with Lab

### Worker Configuration

```typescript
// alchemy.run.ts
const PETRI_DO = DurableObjectNamespace("petri-dish", {
  className: "PetriDish",
});

export const WORKER = await Worker(`${projectName}-worker`, {
  entrypoint: "./worker/index.ts",
  bindings: {
    // ... other bindings
    PETRI_DO,
  },
});
```

### Worker Routing

```typescript
// worker/index.ts
export { PetriDish } from "@acoyfellow/lab-petri/durable-object";

// In fetch handler:
if (url.pathname.startsWith("/petri/")) {
  const dishId = url.pathname.split("/")[2];
  const id = env.PETRI_DO.idFromName(dishId);
  const stub = env.PETRI_DO.get(id);
  return stub.fetch(req);
}
```

### Guest Template Integration

The `labPetri` binding is injected into generated code:

```typescript
// worker/guest/templates.ts
const petriShim = caps?.petri
  ? `
  const labPetri = {
    async mutate(mutations) {
      const dishId = input?.dishId;
      const res = await fetch("http://internal/petri/" + dishId + "/mutate", ...);
      return data.snapshot;
    },
    async getState() { ... }
  };
`
  : `/* deny proxy */`;
```

## Use Cases

1. **Multiplayer Games:** Agents and humans interact with shared state
2. **Long-running Simulations:** Gardens, ecosystems, markets that evolve over days
3. **Collaborative Agents:** Multiple agents inhabiting the same substrate
4. **Persistent Worlds:** State that survives deployments and restarts

## Future Extensions

- **Time travel:** Replay mutations from any point in history
- **Branching:** Fork a dish at a specific tick
- **Schema migrations:** Evolve schemas while preserving state
- **Access control:** Permissioned mutations per-agent

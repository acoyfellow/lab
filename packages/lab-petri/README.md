# lab-petri

Persistent substrate for Lab experiments. Durable Object-backed state with real-time sync.

## The Idea

Lab generates code. That code runs in a sandbox. But what if instead of returning values, the code **inhabited** a persistent state?

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│  Sandbox    │────▶│   Petri DO  │
│  (Lab)      │◄────│  (labPetri) │◄────│  (State)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                         ┌──────┴──────┐
                                         │   Browser   │
                                         │  (Observe)  │
                                         └─────────────┘
```

The agent calls `labPetri.mutate()`. The Durable Object holds state. The UI observes via WebSocket.

## Installation

```bash
npm install @acoyfellow/lab-petri
```

## Quick Start

### 1. Deploy the Durable Object

In your worker:

```typescript
// worker/index.ts
export { PetriDish } from "@acoyfellow/lab-petri/durable-object";

// Route to Petri DO
if (url.pathname.startsWith("/petri/")) {
  const dishId = url.pathname.split("/")[2];
  const id = env.PETRI_DO.idFromName(dishId);
  const stub = env.PETRI_DO.get(id);
  return stub.fetch(req);
}
```

Wrangler/Alchemy config:

```typescript
// alchemy.run.ts
const PETRI_DO = DurableObjectNamespace("petri-dish", {
  className: "PetriDish",
});

export const WORKER = await Worker(`${projectName}-worker`, {
  bindings: {
    PETRI_DO,
    // ... other bindings
  },
});
```

### 2. Define Your Experiment

```typescript
import type { PetriSchema } from "@acoyfellow/lab-petri";

interface GameState {
  board: ("X" | "O" | null)[];
  turn: "X" | "O";
  winner: string | null;
}

const gameSchema: PetriSchema<GameState> = {
  id: "tic-tac-toe-v1",
  mutations: ["placeX", "placeO", "reset", "log"],
  
  seed: () => ({
    board: Array(9).fill(null),
    turn: "X",
    winner: null,
  }),
  
  reduce: (state, mutations) => {
    let newState = { ...state };
    
    for (const m of mutations) {
      switch (m.op) {
        case "placeX":
          newState.board[m.index] = "X";
          newState.turn = "O";
          break;
        case "placeO":
          newState.board[m.index] = "O";
          newState.turn = "X";
          break;
        case "reset":
          return gameSchema.seed();
      }
    }
    
    return newState;
  },
};
```

### 3. Connect from Browser

```svelte
<script>
import { PetriClient } from "@acoyfellow/lab-petri";

const client = new PetriClient<GameState>({
  wsUrl: "wss://lab.coey.dev/petri/game-1",
  apiUrl: "https://lab.coey.dev/petri/game-1",
  dishId: "game-1",
});

// Subscribe to real-time updates
client.subscribe((snapshot) => {
  renderBoard(snapshot.state);
});

// Handle user moves
function handleClick(index) {
  client.mutate([
    { op: "placeX", index },
    { op: "log", message: `X placed at ${index}` },
  ]);
}
</script>
```

### 4. Agents Inhabit the Dish

```typescript
import { runGenerate } from "@acoyfellow/lab";

const result = await runGenerate({
  prompt: `Play tic-tac-toe. Use labPetri to make moves.`,
  capabilities: ["petri"], // Enables labPetri binding
  mode: "code",
  input: {
    dishId: "game-1", // Required for labPetri
    // ... other context
  },
});

// Generated code looks like:
// const state = await labPetri.getState();
// await labPetri.mutate([
//   { op: "placeO", index: findBestMove(state) },
//   { op: "log", message: "O takes center" }
// ]);
```

## API Reference

### PetriSchema

```typescript
interface PetriSchema<TState> {
  /** Unique schema identifier */
  id: string;
  
  /** Allowed mutation operations */
  mutations: string[];
  
  /** Factory for initial state */
  seed: () => TState;
  
  /** Apply mutations to state (must be pure) */
  reduce: (state: TState, mutations: Mutation[]) => TState;
}
```

### PetriClient

```typescript
class PetriClient<TState> {
  constructor(options: {
    wsUrl: string;      // WebSocket URL
    apiUrl: string;     // HTTP API URL
    dishId: string;     // Unique dish identifier
    reconnectDelay?: number;
  });
  
  /** Connect via WebSocket */
  connect(): void;
  
  /** Disconnect */
  disconnect(): void;
  
  /** Subscribe to state changes */
  subscribe(observer: (snapshot: PetriSnapshot<TState>) => void): () => void;
  
  /** Apply mutations */
  mutate(mutations: Mutation[]): Promise<PetriSnapshot<TState>>;
  
  /** Get current snapshot (async) */
  getSnapshot(): Promise<PetriSnapshot<TState>>;
}
```

### labPetri (in sandbox)

When `capabilities: ['petri']` is specified:

```typescript
// Inside generated code:
const state = await labPetri.getState();
// Returns the current state from the DO

await labPetri.mutate([
  { op: string, ...params },
  { op: "log", message: string }
]);
// Applies mutations, returns new snapshot
```

## Examples

- **Garden** - Plants growing, seasons changing, agents tending ([examples/garden.ts](./examples/garden.ts))
- Tic-tac-toe - Agents playing against humans
- Conway's Game of Life - Cellular automata

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed design decisions and data flow.

## Differences from Traditional Lab

| Traditional Lab | lab-petri |
|----------------|-----------|
| Agent returns value | Agent calls methods |
| State is ephemeral | State is persistent |
| One-shot execution | Continuous observation |
| Host applies changes | DO validates & applies |
| No real-time updates | WebSocket broadcasts |

## License

MIT

/**
 * PetriDish Durable Object
 * 
 * Simple mutation storage and broadcast system.
 * Stores mutations and current state, broadcasts to WebSocket clients.
 */

import type {
  PetriSnapshot,
  PetriMessage,
  Mutation,
} from './types.js';

interface DishSession {
  websocket: WebSocket;
}

interface DishState<T = unknown> {
  state: T;
  tick: number;
  lastUpdate: number;
  logs: string[];
}

type PlantNode = { id: string; type?: string; energy?: number; [k: string]: unknown };
type PlantLink = { source: string; target: string; [k: string]: unknown };
type GraphState = { nodes?: PlantNode[]; links?: PlantLink[]; season?: string; tick?: number; [k: string]: unknown };

export class PetriDish implements DurableObject {
  private ctx: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, DishSession> = new Map();

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
    
    // Restore existing WebSockets
    this.ctx.getWebSockets().forEach((ws) => {
      this.sessions.set(ws, { websocket: ws });
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[2] || '';

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    if (action === 'mutate' && request.method === 'POST') {
      return this.handleMutate(request);
    }

    if (action === 'snapshot' && request.method === 'GET') {
      return this.handleSnapshot();
    }

    if (action === 'init' && request.method === 'POST') {
      return this.handleInit(request);
    }

    return new Response('Not Found: ' + url.pathname, { status: 404 });
  }

  private async handleWebSocket(_request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = [webSocketPair[0], webSocketPair[1]];
    
    this.ctx.acceptWebSocket(server);
    this.sessions.set(server, { websocket: server });

    // Send current snapshot
    try {
      const snapshot = await this.getSnapshot();
      server.send(JSON.stringify({
        type: 'snapshot',
        data: snapshot,
      } satisfies PetriMessage));
    } catch {
      server.send(JSON.stringify({
        type: 'error',
        error: 'No state initialized',
      } satisfies PetriMessage));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleInit(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { state?: unknown };
      
      if (!body.state) {
        return Response.json({ ok: false, error: 'state required' }, { status: 400 });
      }

      const initial: DishState = {
        state: body.state,
        tick: 0,
        lastUpdate: Date.now(),
        logs: [],
      };
      
      await this.ctx.storage.put('dish', initial);
      
      return Response.json({ ok: true });
    } catch (e) {
      return Response.json(
        { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  private async handleMutate(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { mutations?: Mutation[] };
      
      if (!body.mutations || !Array.isArray(body.mutations)) {
        return Response.json({ ok: false, error: 'mutations array required' }, { status: 400 });
      }

      const dish = await this.ctx.storage.get<DishState>('dish');
      if (!dish) {
        return Response.json({ ok: false, error: 'Dish not initialized' }, { status: 400 });
      }

      // Extract logs
      const logs = body.mutations
        .filter((m): m is { op: 'log'; message: string } => m.op === 'log')
        .map(m => m.message);

      // Apply mutations to state
      dish.state = this.applyMutations(dish.state, body.mutations);

      // Update tick and logs
      dish.tick++;
      dish.lastUpdate = Date.now();
      dish.logs = [...dish.logs, ...logs].slice(-50);

      await this.ctx.storage.put('dish', dish);

      // Broadcast to all clients
      const snapshot = this.toSnapshot(dish);
      this.broadcast({
        type: 'mutation',
        mutations: body.mutations,
        tick: dish.tick,
      });
      this.broadcast({
        type: 'snapshot',
        data: snapshot,
      });

      return Response.json({ ok: true, snapshot });
    } catch (e) {
      return Response.json(
        { ok: false, error: e instanceof Error ? e.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  private async handleSnapshot(): Promise<Response> {
    try {
      const snapshot = await this.getSnapshot();
      return Response.json(snapshot);
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  private async getSnapshot(): Promise<PetriSnapshot> {
    const dish = await this.ctx.storage.get<DishState>('dish');
    if (!dish) {
      throw new Error('Dish not initialized');
    }
    return this.toSnapshot(dish);
  }

  private static VALID_TYPES = ['seed', 'sprout', 'bloom', 'tree', 'fallen'] as const;
  private static LIFECYCLE: Record<string, string> = {
    seed: 'sprout',
    sprout: 'bloom',
    bloom: 'tree',
    tree: 'fallen',
  };

  private sanitizeNodeUpdates(current: PlantNode, updates: Record<string, unknown>): Record<string, unknown> {
    const clean = { ...updates };

    // Enforce valid type + lifecycle order
    if ('type' in clean) {
      const newType = clean.type as string;
      if (!PetriDish.VALID_TYPES.includes(newType as any)) {
        delete clean.type; // drop invalid types
      } else if (newType !== current.type) {
        // Seeds can reveal into any valid type (mystery seed mechanic)
        // Other types can only advance one lifecycle step
        if (current.type !== 'seed') {
          const allowed = PetriDish.LIFECYCLE[current.type as string];
          if (allowed && newType !== allowed) delete clean.type;
        }
      }
    }

    // Clamp energy to [0, 1]
    if ('energy' in clean && typeof clean.energy === 'number') {
      clean.energy = Math.max(0, Math.min(1, clean.energy));
    }

    // Clamp size to [1, 60]
    if ('size' in clean && typeof clean.size === 'number') {
      clean.size = Math.max(1, Math.min(60, clean.size));
    }

    return clean;
  }

  private applyMutations(state: unknown, mutations: Mutation[]): unknown {
    const s = state as GraphState;
    let nodes = [...(s.nodes ?? [])] as PlantNode[];
    let links = [...(s.links ?? [])] as PlantLink[];
    let season = s.season;
    const tick = (s.tick ?? 0) + 1;

    for (const m of mutations) {
      if (m.op === 'updateNode' && m.id) {
        const id = m.id as string;
        const raw = m.updates as Record<string, unknown> | undefined;
        const current = nodes.find(n => n.id === id);
        if (current && raw) {
          const updates = this.sanitizeNodeUpdates(current, raw);
          nodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
        }
      } else if (m.op === 'addNode' && m.node) {
        const node = m.node as PlantNode;
        // Validate type on new nodes
        if (node.type && !PetriDish.VALID_TYPES.includes(node.type as any)) {
          node.type = 'seed';
        }
        if (typeof node.energy === 'number') {
          node.energy = Math.max(0, Math.min(1, node.energy as number));
        }
        if (!nodes.find(n => n.id === node.id)) nodes = [...nodes, node];
      } else if (m.op === 'removeNode' && m.id) {
        const id = m.id as string;
        nodes = nodes.filter(n => n.id !== id);
        links = links.filter(l => l.source !== id && l.target !== id);
      } else if (m.op === 'addLink' && m.link) {
        links = [...links, m.link as PlantLink];
      } else if (m.op === 'removeLink') {
        const src = m.source as string, tgt = m.target as string;
        links = links.filter(l => !(l.source === src && l.target === tgt));
      } else if (m.op === 'nextSeason') {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        season = seasons[(seasons.indexOf(season ?? 'spring') + 1) % 4];
      }
      // 'log' op — no state change
    }

    return { ...s, nodes, links, season, tick };
  }

  private toSnapshot(dish: DishState): PetriSnapshot {
    return {
      dishId: this.ctx.id.toString(),
      state: dish.state,
      tick: dish.tick,
      lastUpdate: dish.lastUpdate,
      logs: dish.logs,
    };
  }

  private broadcast(message: PetriMessage): void {
    const data = JSON.stringify(message);
    for (const [ws, _session] of this.sessions) {
      try {
        ws.send(data);
      } catch {
        // Client disconnected
      }
    }
  }

  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {
    // Handle client messages if needed
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }
}

interface Env {
  // User's bindings
}

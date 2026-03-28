/**
 * PetriDish Durable Object
 *
 * Simple mutation storage and broadcast system.
 * Stores mutations and current state, broadcasts to WebSocket clients.
 */
export class PetriDish {
    ctx;
    env;
    sessions = new Map();
    constructor(ctx, env) {
        this.ctx = ctx;
        this.env = env;
        // Restore existing WebSockets
        this.ctx.getWebSockets().forEach((ws) => {
            this.sessions.set(ws, { websocket: ws });
        });
    }
    async fetch(request) {
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
    async handleWebSocket(_request) {
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
            }));
        }
        catch {
            server.send(JSON.stringify({
                type: 'error',
                error: 'No state initialized',
            }));
        }
        return new Response(null, { status: 101, webSocket: client });
    }
    async handleInit(request) {
        try {
            const body = await request.json();
            if (!body.state) {
                return Response.json({ ok: false, error: 'state required' }, { status: 400 });
            }
            const initial = {
                state: body.state,
                tick: 0,
                lastUpdate: Date.now(),
                logs: [],
            };
            await this.ctx.storage.put('dish', initial);
            return Response.json({ ok: true });
        }
        catch (e) {
            return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
        }
    }
    async handleMutate(request) {
        try {
            const body = await request.json();
            if (!body.mutations || !Array.isArray(body.mutations)) {
                return Response.json({ ok: false, error: 'mutations array required' }, { status: 400 });
            }
            const dish = await this.ctx.storage.get('dish');
            if (!dish) {
                return Response.json({ ok: false, error: 'Dish not initialized' }, { status: 400 });
            }
            // Extract logs
            const logs = body.mutations
                .filter((m) => m.op === 'log')
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
        }
        catch (e) {
            return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
        }
    }
    async handleSnapshot() {
        try {
            const snapshot = await this.getSnapshot();
            return Response.json(snapshot);
        }
        catch (e) {
            return Response.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
        }
    }
    async getSnapshot() {
        const dish = await this.ctx.storage.get('dish');
        if (!dish) {
            throw new Error('Dish not initialized');
        }
        return this.toSnapshot(dish);
    }
    static VALID_TYPES = ['seed', 'sprout', 'bloom', 'tree', 'fallen'];
    static LIFECYCLE = {
        seed: 'sprout',
        sprout: 'bloom',
        bloom: 'tree',
        tree: 'fallen',
    };
    sanitizeNodeUpdates(current, updates) {
        const clean = { ...updates };
        // Enforce valid type + lifecycle order
        if ('type' in clean) {
            const newType = clean.type;
            if (!PetriDish.VALID_TYPES.includes(newType)) {
                delete clean.type; // drop invalid types
            }
            else if (newType !== current.type) {
                // only allow advancing one step (or staying the same)
                const allowed = PetriDish.LIFECYCLE[current.type];
                if (allowed && newType !== allowed)
                    delete clean.type;
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
    applyMutations(state, mutations) {
        const s = state;
        let nodes = [...(s.nodes ?? [])];
        let links = [...(s.links ?? [])];
        let season = s.season;
        const tick = (s.tick ?? 0) + 1;
        for (const m of mutations) {
            if (m.op === 'updateNode' && m.id) {
                const id = m.id;
                const raw = m.updates;
                const current = nodes.find(n => n.id === id);
                if (current && raw) {
                    const updates = this.sanitizeNodeUpdates(current, raw);
                    nodes = nodes.map(n => n.id === id ? { ...n, ...updates } : n);
                }
            }
            else if (m.op === 'addNode' && m.node) {
                const node = m.node;
                // Validate type on new nodes
                if (node.type && !PetriDish.VALID_TYPES.includes(node.type)) {
                    node.type = 'seed';
                }
                if (typeof node.energy === 'number') {
                    node.energy = Math.max(0, Math.min(1, node.energy));
                }
                if (!nodes.find(n => n.id === node.id))
                    nodes = [...nodes, node];
            }
            else if (m.op === 'removeNode' && m.id) {
                const id = m.id;
                nodes = nodes.filter(n => n.id !== id);
                links = links.filter(l => l.source !== id && l.target !== id);
            }
            else if (m.op === 'addLink' && m.link) {
                links = [...links, m.link];
            }
            else if (m.op === 'removeLink') {
                const src = m.source, tgt = m.target;
                links = links.filter(l => !(l.source === src && l.target === tgt));
            }
            else if (m.op === 'nextSeason') {
                const seasons = ['spring', 'summer', 'autumn', 'winter'];
                season = seasons[(seasons.indexOf(season ?? 'spring') + 1) % 4];
            }
            // 'log' op — no state change
        }
        return { ...s, nodes, links, season, tick };
    }
    toSnapshot(dish) {
        return {
            dishId: this.ctx.id.toString(),
            state: dish.state,
            tick: dish.tick,
            lastUpdate: dish.lastUpdate,
            logs: dish.logs,
        };
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        for (const [ws, _session] of this.sessions) {
            try {
                ws.send(data);
            }
            catch {
                // Client disconnected
            }
        }
    }
    async webSocketMessage(_ws, _message) {
        // Handle client messages if needed
    }
    async webSocketClose(ws) {
        this.sessions.delete(ws);
    }
}

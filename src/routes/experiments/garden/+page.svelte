<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as d3 from 'd3';
  import SEO from '$lib/SEO.svelte';
  import { runGenerate } from '../../data.remote';
  import { BarChart3, X, ClipboardCopy, Check } from '@lucide/svelte';

  type Mutation = { op: string; [key: string]: unknown };

  type PlantType = 'seed' | 'sprout' | 'bloom' | 'tree' | 'fallen';

  interface Plant {
    id: string;
    type: PlantType;
    age: number;
    energy: number;
    color: string;
    size: number;
    label?: string;
  }

  interface Link {
    source: string;
    target: string;
    type: 'roots' | 'pollination' | 'shade' | 'nutrients';
    strength: number;
  }

  interface GardenState {
    nodes: Plant[];
    links: Link[];
    tick: number;
    season: string;
  }

  interface SimNode extends d3.SimulationNodeDatum {
    id: string;
    type: PlantType;
    age: number;
    energy: number;
    color: string;
    size: number;
    label?: string;
  }

  interface SimLink extends d3.SimulationLinkDatum<SimNode> {
    type: string;
    strength: number;
  }

  type EventEntry = { ts: string; kind: 'info' | 'error' | 'mutation' | 'agent'; text: string; href?: string };

  // ── Plant catalog for garden setup ──
  interface CatalogPlant {
    id: string;
    label: string;
    type: PlantType;
    cost: number;
    age: number;
    energy: number;
    color: string;
    size: number;
    desc: string;
  }

  const BUDGET = 12;

  const CATALOG: CatalogPlant[] = [
    { id: 'seed',   label: 'Mystery Seed',  type: 'seed',   cost: 1, age: 0, energy: 0.3, color: '#8b6914', size: 5,  desc: 'Cheap and unpredictable' },
    { id: 'moss',   label: 'Moss',          type: 'sprout', cost: 2, age: 1, energy: 0.5, color: '#6b8f3c', size: 8,  desc: 'Hardy ground cover' },
    { id: 'daisy',  label: 'Daisy',         type: 'bloom',  cost: 3, age: 2, energy: 0.8, color: '#f5c542', size: 12, desc: 'Bright and cheerful' },
    { id: 'fern',   label: 'Fern',          type: 'bloom',  cost: 3, age: 3, energy: 0.7, color: '#4a7c29', size: 14, desc: 'Lush shade lover' },
    { id: 'rose',   label: 'Wild Rose',     type: 'bloom',  cost: 4, age: 3, energy: 0.85, color: '#c94060', size: 15, desc: 'Beautiful but fragile' },
    { id: 'oak',    label: 'Old Oak',       type: 'tree',   cost: 5, age: 12, energy: 0.9, color: '#2d5016', size: 28, desc: 'Anchors the garden' },
    { id: 'willow', label: 'Willow',        type: 'tree',   cost: 5, age: 8, energy: 0.8, color: '#3a6b2a', size: 24, desc: 'Graceful and deep-rooted' },
  ];

  function getOrCreateDishId() {
    const key = 'petri:dishId';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'garden-' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, id);
    }
    return id;
  }

  let dishId = $state('');
  let initializing = $state(true);
  let needsSetup = $state(false);
  let cart: CatalogPlant[] = $state([]);
  let cartSpent = $derived(cart.reduce((s, p) => s + p.cost, 0));
  let gardenState: GardenState | null = $state(null);
  let connected = $state(false);
  let running = $state(false);
  let waiting = $state(false);
  let lastTraceId: string | null = $state(null);
  let lastCode: string = $state('');
  let events: EventEntry[] = $state([]);
  let menuOpen = $state(false);
  let statsOpen = $state(false);
  let iterations = $state(0);
  let stateVersion = $state(0); // bumped on every state change to drive $effect
  let consecutiveErrors = 0;
  let logCopied = $state(false);

  function copyLog() {
    const text = events.map(ev => `${ev.ts} ${ev.kind === 'error' ? '✗' : ev.kind === 'agent' ? '⟳' : ev.kind === 'mutation' ? '△' : '·'} ${ev.text}`).join('\n');
    navigator.clipboard.writeText(text);
    logCopied = true;
    setTimeout(() => logCopied = false, 1500);
  }

  let svgEl = $state<SVGSVGElement | undefined>(undefined);
  let simulation: d3.Simulation<SimNode, SimLink> | null = null;
  let graphInited = false;
  const WIDTH = 600;
  const HEIGHT = 360;

  function logEvent(kind: EventEntry['kind'], text: string, href?: string) {
    const ts = new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    events = [{ ts, kind, text, href }, ...events].slice(0, 100);
  }

  let ws: WebSocket | null = null;
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

  const LINK_COLORS: Record<string, string> = {
    shade: '#6b8f3c',
    nutrients: '#8b6914',
    pollination: '#f5c542',
    roots: '#5a3e1b',
  };

  function getBaseUrl() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:1337' : '';
  }

  function getWsUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const host = isLocal ? 'localhost:1337' : window.location.host;
    return `${protocol}//${host}/petri/${dishId}`;
  }

  async function initDish(id: string) {
    const baseUrl = getBaseUrl();

    const existing = await fetch(`${baseUrl}/petri/${id}/snapshot`);
    if (existing.ok) {
      const snap = await existing.json() as { state?: GardenState; tick?: number; logs?: string[] };
      if (snap.state) {
        gardenState = snap.state;
        stateVersion++;
        iterations = snap.tick ?? snap.state.tick ?? 0;

        if (snap.logs?.length) {
          for (const msg of snap.logs) {
            logEvent('mutation', msg);
          }
          logEvent('info', `restored ${snap.logs.length} log entries from history`);
        }

        return true;
      }
    }

    // No existing state — show the setup form
    needsSetup = true;
    return false;
  }

  // ── Setup cart ───────────────────────────────────────────────────
  function addToCart(plant: CatalogPlant) {
    if (cartSpent + plant.cost > BUDGET) return;
    cart = [...cart, plant];
  }

  function removeFromCart(index: number) {
    cart = cart.filter((_, i) => i !== index);
  }

  async function plantGarden() {
    if (cart.length === 0) return;

    // Build nodes with unique ids
    const counts: Record<string, number> = {};
    const nodes: Plant[] = cart.map(p => {
      counts[p.id] = (counts[p.id] ?? 0) + 1;
      return {
        id: `${p.id}-${counts[p.id]}`,
        type: p.type,
        age: p.age,
        energy: p.energy,
        color: p.color,
        size: p.size,
        label: counts[p.id] > 1 ? `${p.label} ${counts[p.id]}` : p.label,
      };
    });

    // Auto-generate some links between compatible plants
    const links: Link[] = [];
    const trees = nodes.filter(n => n.type === 'tree');
    const blooms = nodes.filter(n => n.type === 'bloom');
    const sprouts = nodes.filter(n => n.type === 'sprout');

    for (const tree of trees) {
      for (const bloom of blooms.slice(0, 2)) {
        links.push({ source: tree.id, target: bloom.id, type: 'shade', strength: 0.5 });
      }
      for (const sprout of sprouts.slice(0, 1)) {
        links.push({ source: tree.id, target: sprout.id, type: 'nutrients', strength: 0.4 });
      }
    }
    for (let i = 0; i < blooms.length - 1; i++) {
      links.push({ source: blooms[i].id, target: blooms[i + 1].id, type: 'pollination', strength: 0.3 });
    }

    const initialState: GardenState = { nodes, links, tick: 0, season: 'spring' };
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/petri/${dishId}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: initialState })
    });

    if (!response.ok) {
      console.error('Failed to init dish:', await response.text());
      return;
    }

    gardenState = initialState;
    stateVersion++;
    iterations = 0;
    needsSetup = false;
    connect();
  }

  // ── D3 Force Graph ──────────────────────────────────────────────
  function nodeRadius(plant: { size: number }): number {
    return Math.max(4, plant.size * 1.2);
  }

  function initGraph() {
    if (!svgEl || !gardenState) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    svg.append('g').attr('class', 'links');
    svg.append('g').attr('class', 'nodes');
    svg.append('g').attr('class', 'labels');

    const simNodes: SimNode[] = gardenState.nodes.map(n => ({
      ...n,
      x: WIDTH / 2 + (Math.random() - 0.5) * 100,
      y: HEIGHT / 2 + (Math.random() - 0.5) * 80,
    }));

    const simLinks: SimLink[] = gardenState.links.map(l => ({
      source: l.source,
      target: l.target,
      type: l.type,
      strength: l.strength,
    }));

    simulation = d3.forceSimulation<SimNode, SimLink>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks).id(d => d.id).distance(80).strength(d => d.strength * 0.5))
      .force('charge', d3.forceManyBody().strength(d => -(d as SimNode).size * 8))
      .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
      .force('collision', d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 6))
      .force('x', d3.forceX(WIDTH / 2).strength(0.03))
      .force('y', d3.forceY(HEIGHT / 2).strength(0.05))
      .alphaDecay(0.02)
      .on('tick', renderTick);

    renderTick();
  }

  function renderTick() {
    if (!svgEl || !simulation) return;
    const svg = d3.select(svgEl);
    const simNodes = simulation.nodes();
    const linkForce = simulation.force<d3.ForceLink<SimNode, SimLink>>('link');
    const simLinks = linkForce ? linkForce.links() : [];

    // ── Links ──
    const linkSel = svg.select('.links')
      .selectAll<SVGLineElement, SimLink>('line')
      .data(simLinks, (d: any) => `${(d.source as SimNode).id}-${(d.target as SimNode).id}`);

    linkSel.exit().transition().duration(300).attr('opacity', 0).remove();

    const linkEnter = linkSel.enter().append('line')
      .attr('stroke', d => LINK_COLORS[d.type] ?? '#666')
      .attr('stroke-width', d => Math.max(1.5, d.strength * 4))
      .attr('stroke-opacity', d => 0.3 + d.strength * 0.4)
      .attr('stroke-dasharray', d => d.type === 'pollination' ? '4 3' : 'none');

    linkEnter.merge(linkSel)
      .attr('x1', d => (d.source as SimNode).x!)
      .attr('y1', d => (d.source as SimNode).y!)
      .attr('x2', d => (d.target as SimNode).x!)
      .attr('y2', d => (d.target as SimNode).y!);

    // ── Nodes ──
    const nodeSel = svg.select('.nodes')
      .selectAll<SVGCircleElement, SimNode>('circle')
      .data(simNodes, (d: SimNode) => d.id);

    nodeSel.exit()
      .transition().duration(400)
      .attr('r', 0).attr('opacity', 0)
      .remove();

    const nodeEnter = nodeSel.enter().append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('filter', 'url(#glow)')
      .attr('fill', d => d.color)
      .attr('opacity', d => d.energy * 0.8 + 0.2)
      .attr('stroke', d => d3.color(d.color)?.brighter(0.8)?.formatHex() ?? '#fff')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.4)
      .call(d3.drag<SVGCircleElement, SimNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
      );

    const allNodes = nodeEnter.merge(nodeSel);
    allNodes
      .attr('cx', d => d.x!)
      .attr('cy', d => d.y!)
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => d.color)
      .attr('opacity', d => d.energy * 0.8 + 0.2)
      .attr('stroke', d => d3.color(d.color)?.brighter(0.8)?.formatHex() ?? '#fff');

    // ── Labels ──
    const labelSel = svg.select('.labels')
      .selectAll<SVGTextElement, SimNode>('text')
      .data(simNodes, (d: SimNode) => d.id);

    labelSel.exit().transition().duration(300).attr('opacity', 0).remove();

    const labelEnter = labelSel.enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('opacity', 0.8)
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, sans-serif')
      .attr('fill', 'var(--text-3)');

    labelEnter.merge(labelSel)
      .attr('x', d => d.x!)
      .attr('y', d => d.y! + nodeRadius(d) + 14)
      .text(d => d.label ?? d.id);
  }

  function updateGraph() {
    if (!simulation || !gardenState) return;

    const oldNodes = simulation.nodes();
    const nodeMap = new Map(oldNodes.map(n => [n.id, n]));

    const simNodes: SimNode[] = gardenState.nodes.map(n => {
      const existing = nodeMap.get(n.id);
      return {
        ...n,
        x: existing?.x ?? WIDTH / 2 + (Math.random() - 0.5) * 60,
        y: existing?.y ?? HEIGHT / 2 + (Math.random() - 0.5) * 40,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
      };
    });

    const simLinks: SimLink[] = gardenState.links.map(l => ({
      source: l.source,
      target: l.target,
      type: l.type,
      strength: l.strength,
    }));

    simulation.nodes(simNodes);
    simulation.force('link', d3.forceLink<SimNode, SimLink>(simLinks).id(d => d.id).distance(80).strength(d => d.strength * 0.5));
    simulation.force('charge', d3.forceManyBody().strength(d => -(d as SimNode).size * 8));
    simulation.force('collision', d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 6));
    simulation.alpha(0.4).restart();
  }

  function dragStarted(event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>) {
    if (!event.active) simulation?.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragEnded(event: d3.D3DragEvent<SVGCircleElement, SimNode, SimNode>) {
    if (!event.active) simulation?.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  // Drive D3 updates from state changes via stateVersion
  $effect(() => {
    const _v = stateVersion;
    if (!gardenState || !svgEl) return;
    if (!graphInited) {
      graphInited = true;
      initGraph();
    } else {
      updateGraph();
    }
  });

  // ── WebSocket & mutations ───────────────────────────────────────
  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return;
    ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
      connected = true;
      logEvent('info', 'connected');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'snapshot') {
        gardenState = msg.data.state;
        stateVersion++;
        iterations = msg.data.tick ?? iterations;
        logEvent('mutation', `snapshot #${msg.data.tick ?? '?'} plants=${msg.data.state?.nodes?.length ?? '?'}`);
      } else if (msg.type === 'mutation') {
        applyMutations(msg.mutations);
        if (msg.tick != null) iterations = msg.tick;
        for (const m of (msg.mutations ?? [])) {
          if (m.op === 'log') logEvent('mutation', m.message);
          else logEvent('mutation', `op=${m.op}${m.id ? ` id=${m.id}` : ''}`);
        }
      } else if (msg.type === 'error') {
        logEvent('error', msg.error ?? 'unknown ws error');
      }
    };

    ws.onclose = (e) => {
      connected = false;
      logEvent('info', `disconnected (${e.code})`);
      if (e.code !== 1000 && e.code !== 1001) {
        setTimeout(connect, 1000);
      }
    };

    ws.onerror = () => {
      logEvent('error', 'WebSocket error');
    };
  }

  function applyMutations(mutations: Mutation[]) {
    if (!gardenState) return;

    for (const m of mutations) {
      switch (m.op) {
        case 'updateNode': {
          const node = gardenState.nodes.find((n: Plant) => n.id === m.id);
          const updates = m.updates as Partial<Plant> | undefined;
          if (node && updates) Object.assign(node, updates);
          break;
        }
        case 'addNode': {
          const node = m.node as Plant | undefined;
          if (node && !gardenState.nodes.find((n: Plant) => n.id === node.id)) gardenState.nodes.push(node);
          break;
        }
        case 'removeNode': {
          gardenState.nodes = gardenState.nodes.filter((n: Plant) => n.id !== m.id);
          gardenState.links = gardenState.links.filter((l: Link) => l.source !== m.id && l.target !== m.id);
          break;
        }
        case 'addLink': {
          if (m.link) gardenState.links.push(m.link as Link);
          break;
        }
        case 'removeLink': {
          gardenState.links = gardenState.links.filter((l: Link) => !(l.source === m.source && l.target === m.target));
          break;
        }
        case 'nextSeason': {
          const idx = SEASONS.indexOf(gardenState.season);
          gardenState.season = SEASONS[(idx + 1) % 4];
          break;
        }
      }
    }

    gardenState = { ...gardenState, nodes: [...gardenState.nodes], links: [...gardenState.links] };
    stateVersion++;
  }

  async function iterate() {
    if (!gardenState || waiting) return;

    waiting = true;
    logEvent('agent', 'tending...');

    const NEXT_TYPE: Record<string, string> = { seed: 'sprout', sprout: 'bloom', bloom: 'tree' };
    const REVEALS: CatalogPlant[] = CATALOG.filter(p => p.id !== 'seed');
    const nodes = gardenState?.nodes ?? [];
    const links = gardenState?.links ?? [];

    // Pre-compute mandatory mutations
    const ops: string[] = [];

    // 1. Advance eligible plants (cap at 6 per iteration to keep prompt within token limits)
    const eligible = [...nodes].sort((a, b) => b.energy - a.energy).slice(0, 6);
    for (const n of eligible) {
      if (n.energy >= 0.3 && NEXT_TYPE[n.type]) {
        if (n.type === 'seed') {
          const reveal = REVEALS[Math.floor(Math.random() * REVEALS.length)];
          ops.push(`  { op: 'updateNode', id: '${n.id}', updates: { type: '${reveal.type}', energy: ${reveal.energy}, size: ${reveal.size}, color: '${reveal.color}', label: '${reveal.label}' } }`);
        } else {
          ops.push(`  { op: 'updateNode', id: '${n.id}', updates: { type: '${NEXT_TYPE[n.type]}', energy: ${Math.min(1, n.energy + 0.15).toFixed(2)}, size: ${Math.min(60, n.size + 4)} } }`);
        }
      } else if (n.energy < 0.1) {
        ops.push(`  { op: 'removeNode', id: '${n.id}' }`);
      } else {
        ops.push(`  { op: 'updateNode', id: '${n.id}', updates: { energy: ${Math.min(1, n.energy + 0.1).toFixed(2)} } }`);
      }
    }

    // 2. Auto-advance season every 3 iterations
    if ((gardenState?.tick ?? 0) % 3 === 2) {
      ops.push(`  { op: 'nextSeason' }`);
    }

    // 3. Suggest a few links between unlinked plants (cap at 3 to keep prompt small)
    const linkedPairs = new Set(links.map(l => `${l.source}-${l.target}`));
    const linkTypes = ['roots', 'pollination', 'shade', 'nutrients'];
    let linkCount = 0;
    for (let i = 0; i < nodes.length && linkCount < 3; i++) {
      for (let j = i + 1; j < nodes.length && linkCount < 3; j++) {
        const key = `${nodes[i].id}-${nodes[j].id}`;
        if (!linkedPairs.has(key) && Math.random() < 0.3) {
          const lt = linkTypes[Math.floor(Math.random() * linkTypes.length)];
          ops.push(`  { op: 'addLink', link: { source: '${nodes[i].id}', target: '${nodes[j].id}', type: '${lt}', strength: ${(0.3 + Math.random() * 0.7).toFixed(2)} } }`);
          linkCount++;
        }
      }
    }

    const prompt = `Tend the garden. You MUST call labPetri.mutate() with an array of mutation objects.

CURRENT: ${nodes.length} plants, ${links.length} links, season=${gardenState?.season}, tick=${gardenState?.tick}

Here are the REQUIRED mutations — include ALL of them, then ADD your own creative additions:
const mutations = [
${ops.join(',\n')},
  // === YOUR ADDITIONS BELOW ===
  // Be bold! Do several of these each turn:
  // - addNode: introduce a new seedling or wildflower (give it a unique id, label, color, type='seed', energy, size)
  // - Change colors to reflect season (autumn = warm tones, winter = muted, spring = bright)
  // - Adjust energy dramatically: storms drain energy (-0.3), sunshine boosts it (+0.3)
  // - Add narrative log messages — tell the story of what's happening
  // Add at LEAST 2-3 of your own mutations before the final log.
  { op: 'log', message: 'YOUR_NARRATIVE_LOG_HERE' }
];
return await labPetri.mutate(mutations);

VALID OPS: updateNode(id, updates:{type,energy,size,color}), addNode(node:{id,type,energy,size,color,label}), removeNode(id), addLink(link:{source,target,type,strength}), removeLink(source,target), nextSeason, log(message).
Type lifecycle: seed→sprout→bloom→tree→fallen (one step only, server rejects skips).`;

    try {
      const result = await runGenerate({
        prompt,
        mode: 'code',
        capabilities: ['petri', 'fetch'],
        maxTokens: 2048,
        input: {
          dishId,
          state: gardenState,
          nodes: gardenState.nodes,
          links: gardenState.links,
        }
      });

      lastTraceId = result.traceId ?? null;
      lastCode = result.generated ?? '';
      consecutiveErrors = 0;

      if (!result.ok) {
        logEvent('error', result.error ?? 'unknown error');
      } else {
        logEvent('agent', `done${lastTraceId ? ` /t/${lastTraceId}` : ''}`, lastTraceId ? `/t/${lastTraceId}` : undefined);
      }
    } catch (e) {
      consecutiveErrors++;
      const msg = e instanceof Error ? e.message : String(e);
      logEvent('error', msg);
      if (consecutiveErrors >= 3) {
        logEvent('error', 'Too many consecutive failures — stopping.');
        running = false;
      }
    }

    waiting = false;
  }

  function start() {
    running = true;
    iterateLoop();
  }

  function stop() {
    running = false;
  }

  async function iterateLoop() {
    while (running) {
      await iterate();
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  async function startOver() {
    menuOpen = false;
    stop();
    ws?.close();
    ws = null;
    connected = false;

    localStorage.removeItem('petri:dishId');
    events = [];
    gardenState = null;
    lastCode = '';
    lastTraceId = null;
    iterations = 0;
    graphInited = false;
    stateVersion = 0;
    initializing = true;

    if (simulation) { simulation.stop(); simulation = null; }
    if (svgEl) d3.select(svgEl).selectAll('*').remove();

    const id = getOrCreateDishId();
    dishId = id;
    cart = [];
    needsSetup = true;
    initializing = false;
  }

  onMount(async () => {
    const id = getOrCreateDishId();
    dishId = id;
    const ok = await initDish(id);
    initializing = false;
    if (ok) connect();
  });

  onDestroy(() => {
    stop();
    ws?.close();
    if (simulation) simulation.stop();
  });
</script>

<SEO title="Garden — Lab" description="Your personal AI-tended garden. Watch it grow and change in real time — your garden persists between visits." path="/experiments/garden" />

{#if menuOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-40" onclick={() => menuOpen = false}></div>
{/if}

<div class="max-w-3xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <div class="flex items-baseline justify-between">
      <h1 class="text-2xl font-semibold text-(--text)">Garden</h1>
      <a href="https://github.com/acoyfellow/lab/blob/main/src/routes/experiments/garden/%2Bpage.svelte" class="text-xs text-(--text-3) hover:text-(--accent) transition-colors">Source</a>
    </div>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      Your personal garden, tended by an AI gardener. Hit start and watch it grow in real time —
      your garden is yours alone, and picks up where you left off each visit.
    </p>
  </header>

  {#if needsSetup}
    <!-- ── Garden Setup ── -->
    <div class="rounded-xl border border-(--border) bg-(--code-bg) p-6 space-y-5">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-medium text-(--text)">Plant your garden</h2>
        <span class="text-xs tabular-nums {cartSpent > BUDGET ? 'text-red-400' : 'text-(--text-3)'}">
          {BUDGET - cartSpent} of {BUDGET} pts remaining
        </span>
      </div>

      <!-- Budget bar -->
      <div class="h-1.5 rounded-full bg-(--border) overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-200 {cartSpent > BUDGET ? 'bg-red-400' : 'bg-(--accent)'}"
          style="width: {Math.min(100, (cartSpent / BUDGET) * 100)}%"
        ></div>
      </div>

      <!-- Catalog -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {#each CATALOG as plant}
          {@const canAfford = cartSpent + plant.cost <= BUDGET}
          <button
            onclick={() => addToCart(plant)}
            disabled={!canAfford}
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-(--border) text-left transition-colors cursor-pointer hover:border-(--accent)/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div
              class="rounded-full shrink-0"
              style="width: {Math.max(12, plant.size)}px; height: {Math.max(12, plant.size)}px; background-color: {plant.color}; opacity: {plant.energy * 0.8 + 0.2};"
            ></div>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-medium text-(--text)">{plant.label}</div>
              <div class="text-[10px] text-(--text-3)">{plant.desc}</div>
            </div>
            <span class="text-xs tabular-nums text-(--text-3) shrink-0">{plant.cost}pt</span>
          </button>
        {/each}
      </div>

      <!-- Cart -->
      {#if cart.length > 0}
        <div class="space-y-2">
          <h3 class="text-xs font-medium text-(--text-2)">Your picks</h3>
          <div class="flex flex-wrap gap-2">
            {#each cart as plant, i}
              <button
                onclick={() => removeFromCart(i)}
                class="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full bg-(--surface) border border-(--border) text-xs text-(--text-2) hover:border-red-300 transition-colors cursor-pointer group"
              >
                <div
                  class="w-2.5 h-2.5 rounded-full shrink-0"
                  style="background-color: {plant.color};"
                ></div>
                {plant.label}
                <span class="text-(--text-3) group-hover:text-red-400 ml-0.5">&times;</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <button
        onclick={plantGarden}
        disabled={cart.length === 0}
        class="w-full px-4 py-2.5 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {cart.length === 0 ? 'Pick some plants to get started' : `Plant Garden (${cart.length} plant${cart.length === 1 ? '' : 's'})`}
      </button>
    </div>

  {:else}
    <!-- ── Active Garden Controls ── -->
    <div class="flex items-center gap-3 flex-wrap">
      {#if !running}
        <button onclick={start} disabled={initializing || !connected || waiting} class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
          {initializing ? 'Loading...' : connected ? 'Start Gardening' : 'Connecting...'}
        </button>
      {:else}
        <button onclick={stop} class="px-4 py-2 rounded-lg bg-(--code-bg) text-(--text) text-sm font-medium border border-(--border) hover:opacity-90 transition-opacity cursor-pointer">
          Stop
        </button>
      {/if}

      <div class="relative">
        <button onclick={() => menuOpen = !menuOpen} class="px-2 py-2 rounded-lg bg-(--code-bg) text-(--text-3) text-sm border border-(--border) hover:opacity-90 transition-opacity cursor-pointer">
          &middot;&middot;&middot;
        </button>
        {#if menuOpen}
          <div class="absolute top-full left-0 mt-1 z-50 bg-(--code-bg) border border-(--border) rounded-lg shadow-lg overflow-hidden min-w-[160px]">
            <button onclick={startOver} class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-(--border) transition-colors cursor-pointer">
              Start Over
            </button>
          </div>
        {/if}
      </div>

      <button
        onclick={() => statsOpen = !statsOpen}
        class="px-2 py-2 rounded-lg bg-(--code-bg) text-(--text-3) text-sm border border-(--border) hover:opacity-90 transition-opacity cursor-pointer"
        title="Garden stats"
      >
        {#if statsOpen}<X size={14} />{:else}<BarChart3 size={14} />{/if}
      </button>

      <div class="ml-auto text-xs text-(--text-3) tabular-nums">
        {#if gardenState}
          {gardenState.nodes.length} plants · {gardenState.season} · #{iterations}
        {:else if initializing}
          Loading your garden...
        {:else}
          {connected ? 'Ready' : 'Connecting...'}
        {/if}
      </div>
    </div>

    <!-- Garden Visualization -->
  <div class="relative rounded-xl border border-(--border) overflow-hidden bg-(--code-bg)">
    <div class="absolute top-3 left-3 font-mono text-[10px] text-(--text-3) opacity-50 tracking-wider uppercase select-none z-10">
      {dishId}
    </div>
    {#if waiting}
      <div class="absolute top-3 right-3 w-4 h-4 z-10">
        <svg class="animate-spin text-(--text-3)" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
      </div>
    {/if}

    <!-- Stats overlay -->
    {#if statsOpen && gardenState}
      {@const typeCounts = gardenState.nodes.reduce((acc, n) => { acc[n.type] = (acc[n.type] ?? 0) + 1; return acc; }, {} as Record<string, number>)}
      {@const avgEnergy = gardenState.nodes.length ? +(gardenState.nodes.reduce((s, n) => s + n.energy, 0) / gardenState.nodes.length).toFixed(2) : 0}
      <div class="absolute inset-0 z-20 bg-(--code-bg)/95 backdrop-blur-sm p-5 overflow-y-auto">
        <div class="space-y-4 max-w-sm mx-auto">
          <h3 class="text-sm font-medium text-(--text)">Garden Snapshot</h3>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="space-y-1">
              <div class="text-(--text-3)">Season</div>
              <div class="text-(--text) font-medium capitalize">{gardenState.season}</div>
            </div>
            <div class="space-y-1">
              <div class="text-(--text-3)">Iterations</div>
              <div class="text-(--text) font-medium tabular-nums">{iterations}</div>
            </div>
            <div class="space-y-1">
              <div class="text-(--text-3)">Plants</div>
              <div class="text-(--text) font-medium">{gardenState.nodes.length}</div>
            </div>
            <div class="space-y-1">
              <div class="text-(--text-3)">Links</div>
              <div class="text-(--text) font-medium">{gardenState.links.length}</div>
            </div>
            <div class="space-y-1">
              <div class="text-(--text-3)">Avg Energy</div>
              <div class="text-(--text) font-medium tabular-nums">{avgEnergy}</div>
            </div>
            <div class="space-y-1">
              <div class="text-(--text-3)">Composition</div>
              <div class="text-(--text) font-medium">
                {Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(', ') || 'empty'}
              </div>
            </div>
          </div>

          <h4 class="text-xs font-medium text-(--text-2) pt-2">All Plants</h4>
          <div class="space-y-1.5">
            {#each gardenState.nodes as plant}
              <div class="flex items-center gap-2 text-xs">
                <div
                  class="w-3 h-3 rounded-full shrink-0"
                  style="background-color: {plant.color}; opacity: {plant.energy * 0.8 + 0.2};"
                ></div>
                <span class="text-(--text) font-medium min-w-0 truncate">{plant.label ?? plant.id}</span>
                <span class="text-(--text-3) capitalize">{plant.type}</span>
                <div class="ml-auto flex items-center gap-2 shrink-0 tabular-nums">
                  <span class="text-(--text-3)" title="energy">{(plant.energy * 100).toFixed(0)}%</span>
                  <div class="w-12 h-1.5 rounded-full bg-(--border) overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all duration-300"
                      style="width: {plant.energy * 100}%; background-color: {plant.energy > 0.5 ? '#4ade80' : plant.energy > 0.2 ? '#fbbf24' : '#f87171'};"
                    ></div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    <!-- D3 force graph — nodes animate in from r=0 when data arrives -->
    <svg
      bind:this={svgEl}
      width="100%"
      height={HEIGHT}
      viewBox="0 0 {WIDTH} {HEIGHT}"
      class="d3-garden"
    ></svg>

    {#if gardenState && gardenState.links.length > 0}
      {@const labelOf = (id: string) => gardenState!.nodes.find(n => n.id === id)?.label ?? id}
      {@const verbs: Record<string, string> = { shade: 'shades', nutrients: 'feeds', pollination: 'pollinates', roots: 'roots into' }}
      <div class="px-6 pb-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-(--border) pt-3 mx-4 mb-2">
        {#each gardenState.links as link}
          <span class="text-xs text-(--text-3)">
            {labelOf(link.source)} <span class="opacity-60">{verbs[link.type] ?? link.type}</span> {labelOf(link.target)}
          </span>
        {/each}
      </div>
    {/if}
  </div>

  {/if}

  <!-- Event Log -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-(--text-2)">Event Log</h2>
      {#if events.length > 0}
        <button onclick={copyLog} class="flex items-center gap-1 text-xs text-(--text-3) hover:text-(--text) transition-colors cursor-pointer" title="Copy log">
          {#if logCopied}<Check size={12} /><span>Copied</span>{:else}<ClipboardCopy size={12} /><span>Copy</span>{/if}
        </button>
      {/if}
    </div>
    <div class="bg-(--code-bg) border border-(--border) rounded-lg p-3 h-48 overflow-y-auto font-mono">
      {#if events.length === 0}
        <p class="text-xs text-(--text-3) italic">No events yet</p>
      {:else}
        {#each events as ev}
          <div class="flex gap-2 text-xs leading-5">
            <span class="text-(--text-3) shrink-0">{ev.ts}</span>
            <span class="shrink-0 {ev.kind === 'error' ? 'text-red-400' : ev.kind === 'agent' ? 'text-blue-400' : ev.kind === 'mutation' ? 'text-green-400' : 'text-(--text-3)'}">
              {ev.kind === 'error' ? '✗' : ev.kind === 'agent' ? '⟳' : ev.kind === 'mutation' ? '△' : '·'}
            </span>
            {#if ev.href}
              <a href={ev.href} class="text-(--accent) underline underline-offset-2 hover:opacity-70 break-all">{ev.text}</a>
            {:else}
              <span class="{ev.kind === 'error' ? 'text-red-300' : 'text-(--text-2)'} break-all">{ev.text}</span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Generated Code -->
  {#if lastCode}
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">Last Agent Code</h2>
      <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden">
        <pre class="p-3 text-xs text-(--text-2) overflow-x-auto max-h-64"><code>{lastCode}</code></pre>
      </div>
      {#if lastTraceId}
        <a href="/t/{lastTraceId}" class="text-xs text-(--accent) underline hover:opacity-80">
          View trace /t/{lastTraceId}
        </a>
      {/if}
    </div>
  {/if}
</div>

<style>
  .d3-garden {
    cursor: grab;
  }
  .d3-garden:active {
    cursor: grabbing;
  }
</style>

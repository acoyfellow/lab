<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import SEO from '$lib/SEO.svelte';
  import { runChain } from '../data.remote';
  import type { ChainStep } from '@acoyfellow/lab';

  // --- Types ---
  type PlantNode = d3.SimulationNodeDatum & {
    id: string;
    type: 'seed' | 'sprout' | 'bloom' | 'tree' | 'fallen';
    age: number;
    energy: number;
    color: string;
    size: number;
    label?: string;
  };

  type GardenLink = d3.SimulationLinkDatum<PlantNode> & {
    type: 'roots' | 'pollination' | 'shade' | 'nutrients';
    strength: number;
  };

  type GardenState = {
    nodes: PlantNode[];
    links: GardenLink[];
    tick: number;
    season: string;
    log: string[];
  };

  type TendingAction = {
    narration: string;
    mutations: {
      addNodes?: Omit<PlantNode, 'x' | 'y' | 'vx' | 'vy' | 'index'>[];
      removeNodeIds?: string[];
      updateNodes?: { id: string; [key: string]: unknown }[];
      addLinks?: { source: string; target: string; type: string; strength: number }[];
      removeLinkIndices?: number[];
      season?: string;
    };
  };

  // --- State ---
  let container: HTMLDivElement | undefined = $state(undefined);
  let garden = $state<GardenState>({
    nodes: [],
    links: [],
    tick: 0,
    season: 'spring',
    log: [],
  });
  let running = $state(false);
  let paused = $state(false);
  let traceIds = $state<string[]>([]);
  let currentNarration = $state('');
  let loopCount = $state(0);
  let simulation: d3.Simulation<PlantNode, GardenLink> | null = null;
  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  let width = 800;
  let height = 600;

  // --- Seed the initial garden ---
  function seedGarden(): GardenState {
    const nodes: PlantNode[] = [
      { id: 'oak-1', type: 'tree', age: 12, energy: 0.9, color: '#2d5016', size: 28, label: 'Old Oak' },
      { id: 'fern-1', type: 'bloom', age: 3, energy: 0.7, color: '#4a7c29', size: 14, label: 'Fern' },
      { id: 'moss-1', type: 'sprout', age: 1, energy: 0.5, color: '#6b8f3c', size: 8, label: 'Moss' },
      { id: 'daisy-1', type: 'bloom', age: 2, energy: 0.8, color: '#f5c542', size: 12, label: 'Daisy' },
      { id: 'seed-1', type: 'seed', age: 0, energy: 0.3, color: '#8b6914', size: 5, label: 'Mystery Seed' },
    ];
    const links: GardenLink[] = [
      { source: 'oak-1', target: 'fern-1', type: 'shade', strength: 0.6 },
      { source: 'oak-1', target: 'moss-1', type: 'nutrients', strength: 0.4 },
      { source: 'fern-1', target: 'daisy-1', type: 'pollination', strength: 0.3 },
    ];
    return { nodes, links, tick: 0, season: 'spring', log: ['Garden planted.'] };
  }

  // --- Serialize garden state for the rooms ---
  function serializeGarden(g: GardenState): string {
    const nodes = g.nodes.map((n) => ({
      id: n.id, type: n.type, age: n.age,
      energy: Math.round(n.energy * 100) / 100,
      color: n.color, size: n.size, label: n.label,
    }));
    const links = g.links.map((l, i) => ({
      index: i,
      source: typeof l.source === 'object' ? (l.source as PlantNode).id : l.source,
      target: typeof l.target === 'object' ? (l.target as PlantNode).id : l.target,
      type: l.type, strength: l.strength,
    }));
    return JSON.stringify({ nodes, links, tick: g.tick, season: g.season }, null, 2);
  }

  // ---------------------------------------------------------------
  // Three chain steps per tick. Each runs in a fresh isolate.
  //
  //   Step 1  "Read the garden"    — walk the graph, produce a reading
  //   Step 2  "Decide"             — AI sees the reading, picks one action
  //   Step 3  "Apply"              — validate + apply mutations, return new state
  //
  // The trace captures all three steps — what was seen, what was
  // decided, what changed. That's the feedback loop. The next tick
  // reads the result of this one. An agent grinding toward an
  // objective, with receipts.
  // ---------------------------------------------------------------

  function buildTendingChain(gardenJson: string): ChainStep[] {
    return [
      // --- Step 1: Read the garden ---
      {
        name: 'Read the garden',
        body: `
const g = ${gardenJson};

// Walk the graph. What do we see?
const byType = {};
for (const n of g.nodes) {
  byType[n.type] = (byType[n.type] || 0) + 1;
}

const weakest = g.nodes.reduce((w, n) => n.energy < w.energy ? n : w, g.nodes[0]);
const strongest = g.nodes.reduce((s, n) => n.energy > s.energy ? n : s, g.nodes[0]);

const connectedIds = new Set();
for (const l of g.links) {
  connectedIds.add(l.source);
  connectedIds.add(l.target);
}
const isolated = g.nodes.filter(n => !connectedIds.has(n.id));

// Compose a reading — what the next room will see
return {
  garden: g,
  reading: {
    tick: g.tick,
    season: g.season,
    census: byType,
    population: g.nodes.length,
    connections: g.links.length,
    weakest: { id: weakest.id, label: weakest.label, energy: weakest.energy, type: weakest.type },
    strongest: { id: strongest.id, label: strongest.label, energy: strongest.energy, type: strongest.type },
    isolated: isolated.map(n => n.id),
    nodes: g.nodes.map(n => n.id + " (" + n.type + ", energy:" + n.energy + ", age:" + n.age + ', "' + n.label + '")').join("\\n"),
    links: g.links.map((l, i) => "[" + i + "] " + l.source + " --[" + l.type + ", str:" + l.strength + "]--> " + l.target).join("\\n"),
  }
};
        `,
        capabilities: [],
      },

      // --- Step 2: The gardener decides ---
      {
        name: 'Decide',
        body: `
const { reading } = input;

const prompt = "You are a gardener tending a living graph. Each node is a plant. Each link is an ecological relationship. You are in a room with this reading pinned to the wall:\\n\\n" +
  "Tick: " + reading.tick + "\\n" +
  "Season: " + reading.season + "\\n" +
  "Census: " + JSON.stringify(reading.census) + "\\n" +
  "Population: " + reading.population + ", Connections: " + reading.connections + "\\n" +
  "Weakest: " + reading.weakest.label + " (" + reading.weakest.id + ", energy:" + reading.weakest.energy + ", " + reading.weakest.type + ")\\n" +
  "Strongest: " + reading.strongest.label + " (" + reading.strongest.id + ", energy:" + reading.strongest.energy + ", " + reading.strongest.type + ")\\n" +
  "Isolated (no connections): " + (reading.isolated.length ? reading.isolated.join(", ") : "none") + "\\n\\n" +
  "All nodes:\\n" + reading.nodes + "\\n\\n" +
  "All links:\\n" + (reading.links || "none") + "\\n\\n" +
  "Rules of the garden:\\n" +
  "- Seeds sprout near nutrients/shade. Sprouts become blooms. Blooms become trees. This takes many ticks.\\n" +
  "- Low-energy plants become 'fallen'. Fallen plants get removed next cycle.\\n" +
  "- New seeds drift in naturally. Not every tick.\\n" +
  "- Connections: pollination (bloom<->bloom), shade (tree->smaller), roots (any), nutrients (any).\\n" +
  "- Seasons rotate every ~4 ticks: spring->summer->autumn->winter->spring.\\n" +
  "- Spring: +energy, new seeds. Summer: peak. Autumn: -energy, things fall. Winter: dormancy, death.\\n" +
  "- Isolated plants lose energy faster.\\n\\n" +
  "Decide ONE small tending action. Be restrained. Let the garden breathe.\\n\\n" +
  "Respond with ONLY valid JSON (no markdown, no wrapping):\\n" +
  '{\\n' +
  '  "narration": "A short poetic sentence about what happened",\\n' +
  '  "mutations": {\\n' +
  '    "addNodes": [{"id": "unique-id", "type": "seed", "age": 0, "energy": 0.5, "color": "#hex", "size": 8, "label": "Name"}],\\n' +
  '    "removeNodeIds": ["id-to-remove"],\\n' +
  '    "updateNodes": [{"id": "existing-id", "energy": 0.6}],\\n' +
  '    "addLinks": [{"source": "id", "target": "id", "type": "roots", "strength": 0.5}],\\n' +
  '    "removeLinkIndices": [0],\\n' +
  '    "season": "summer"\\n' +
  '  }\\n' +
  '}\\n' +
  "Only include mutation keys you actually use.";

const response = await ai.run(prompt);

// Parse what the gardener said
let action;
try {
  const cleaned = response.replace(/\`\`\`json?\\n?/g, '').replace(/\`\`\`/g, '').trim();
  action = JSON.parse(cleaned);
} catch (e) {
  action = { narration: "The gardener pauses, listening to the wind.", mutations: {} };
}

// Hand the garden and the decision to the next room
return { garden: input.garden, action };
        `,
        capabilities: ['workersAi'],
      },

      // --- Step 3: Apply ---
      {
        name: 'Apply',
        body: `
const { garden: g, action } = input;
const m = action.mutations || {};
let nodes = [...g.nodes];
let links = [...g.links];

// Remove dead plants and their connections
if (m.removeNodeIds && m.removeNodeIds.length) {
  const gone = new Set(m.removeNodeIds);
  nodes = nodes.filter(n => !gone.has(n.id));
  links = links.filter(l => !gone.has(l.source) && !gone.has(l.target));
}

// Update existing plants
if (m.updateNodes && m.updateNodes.length) {
  for (const upd of m.updateNodes) {
    const node = nodes.find(n => n.id === upd.id);
    if (!node) continue;
    if (upd.energy !== undefined) node.energy = Math.max(0, Math.min(1, upd.energy));
    if (upd.age !== undefined) node.age = upd.age;
    if (upd.type !== undefined) node.type = upd.type;
    if (upd.color !== undefined) node.color = upd.color;
    if (upd.size !== undefined) node.size = Math.max(3, Math.min(40, upd.size));
    if (upd.label !== undefined) node.label = upd.label;
  }
}

// Plant new seeds/plants
if (m.addNodes && m.addNodes.length) {
  for (const add of m.addNodes) {
    if (nodes.find(n => n.id === add.id)) continue;
    nodes.push({
      id: add.id,
      type: add.type || "seed",
      age: add.age || 0,
      energy: Math.max(0, Math.min(1, add.energy || 0.5)),
      color: add.color || "#8b6914",
      size: Math.max(3, Math.min(40, add.size || 6)),
      label: add.label || add.id,
    });
  }
}

// Prune connections
if (m.removeLinkIndices && m.removeLinkIndices.length) {
  const toRemove = new Set(m.removeLinkIndices);
  links = links.filter((_, i) => !toRemove.has(i));
}

// Form new connections (only between existing nodes)
if (m.addLinks && m.addLinks.length) {
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const add of m.addLinks) {
    if (nodeIds.has(add.source) && nodeIds.has(add.target)) {
      links.push({
        source: add.source,
        target: add.target,
        type: add.type || "roots",
        strength: Math.max(0.1, Math.min(1, add.strength || 0.3)),
      });
    }
  }
}

const season = m.season || g.season;

return {
  nodes,
  links,
  tick: g.tick + 1,
  season,
  narration: action.narration || "Silence in the garden.",
};
        `,
        capabilities: [],
      },
    ];
  }

  // --- Apply the result from Room 3 back to the page ---
  function applyResult(g: GardenState, result: { nodes: PlantNode[]; links: GardenLink[]; tick: number; season: string; narration: string }): GardenState {
    // Preserve D3 simulation positions for nodes that survived
    const posMap = new Map<string, { x?: number; y?: number }>();
    for (const n of g.nodes) {
      if (n.x !== undefined) posMap.set(n.id, { x: n.x, y: n.y });
    }

    const nodes = result.nodes.map((n) => {
      const pos = posMap.get(n.id);
      return pos
        ? { ...n, x: pos.x, y: pos.y }
        : { ...n, x: width / 2 + (Math.random() - 0.5) * 120, y: height / 2 + (Math.random() - 0.5) * 120 };
    });

    return {
      nodes,
      links: result.links,
      tick: result.tick,
      season: result.season,
      log: [...g.log.slice(-29), `[${result.tick}] ${result.narration}`],
    };
  }

  // --- D3 rendering ---
  const SEASON_BG: Record<string, string> = {
    spring: '#0a1a0a',
    summer: '#0a1a0f',
    autumn: '#1a150a',
    winter: '#0a0f1a',
  };

  const LINK_COLORS: Record<string, string> = {
    roots: '#8b6914',
    pollination: '#e8a0bf',
    shade: '#4a6741',
    nutrients: '#6b8f3c',
  };

  function renderGarden(g: GardenState) {
    if (!svg || !simulation) return;

    svg.select('.bg-rect')
      .transition()
      .duration(800)
      .attr('fill', SEASON_BG[g.season] ?? SEASON_BG.spring);

    // Links
    const linkSel = svg.select('.links').selectAll<SVGLineElement, GardenLink>('line').data(g.links, (_d, i) => `link-${i}`);
    linkSel.exit().transition().duration(400).attr('opacity', 0).remove();
    const linkEnter = linkSel
      .enter()
      .append('line')
      .attr('opacity', 0)
      .attr('stroke-width', (d: GardenLink) => d.strength * 3)
      .attr('stroke', (d: GardenLink) => LINK_COLORS[d.type] ?? '#555')
      .attr('stroke-dasharray', (d: GardenLink) => (d.type === 'pollination' ? '4,4' : 'none'));
    linkEnter.transition().duration(600).attr('opacity', 0.6);
    linkSel.merge(linkEnter)
      .transition()
      .duration(600)
      .attr('stroke-width', (d: GardenLink) => d.strength * 3)
      .attr('stroke', (d: GardenLink) => LINK_COLORS[d.type] ?? '#555');

    // Nodes
    const nodeSel = svg.select('.nodes').selectAll<SVGGElement, PlantNode>('g.plant').data(g.nodes, (d: PlantNode) => d.id);
    nodeSel.exit()
      .transition().duration(600)
      .style('opacity', '0')
      .remove();

    const nodeEnter = nodeSel
      .enter()
      .append('g')
      .attr('class', 'plant')
      .style('opacity', '0')
      .call(d3.drag<SVGGElement, PlantNode>()
        .on('start', (_event, d) => { simulation!.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (_event, d) => { simulation!.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Glow filter for energy
    nodeEnter.append('circle').attr('class', 'glow');
    nodeEnter.append('circle').attr('class', 'core');
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-3)')
      .attr('font-size', '9px')
      .attr('pointer-events', 'none');

    nodeEnter.transition().duration(800).style('opacity', '1');

    const merged = nodeSel.merge(nodeEnter);

    // Outer glow — energy halo
    merged.select('.glow')
      .transition().duration(600)
      .attr('r', (d: PlantNode) => d.size + 4 + d.energy * 6)
      .attr('fill', 'none')
      .attr('stroke', (d: PlantNode) => d.color)
      .attr('stroke-width', (d: PlantNode) => d.energy * 2)
      .attr('opacity', (d: PlantNode) => d.type === 'fallen' ? 0 : d.energy * 0.25);

    // Core circle
    merged.select('.core')
      .transition().duration(600)
      .attr('r', (d: PlantNode) => d.size)
      .attr('fill', (d: PlantNode) => d.color)
      .attr('stroke', (d: PlantNode) => d.type === 'fallen' ? '#5a3a1a' : d3.color(d.color)?.brighter(0.8)?.toString() ?? '#fff')
      .attr('stroke-width', (d: PlantNode) => d.type === 'tree' ? 2.5 : 1.5)
      .attr('opacity', (d: PlantNode) => d.type === 'fallen' ? 0.3 : 0.7 + d.energy * 0.3);

    merged.select('text')
      .text((d: PlantNode) => d.label ?? d.id)
      .attr('dy', (d: PlantNode) => d.size + 14);

    // Restart simulation
    simulation.nodes(g.nodes);
    (simulation.force('link') as d3.ForceLink<PlantNode, GardenLink>).links(g.links);
    simulation.alpha(0.3).restart();
  }

  function initD3() {
    if (!container) return;

    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = Math.max(500, rect.height);

    svg = d3.select(container).append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    svg.append('rect')
      .attr('class', 'bg-rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', SEASON_BG.spring)
      .attr('rx', 12);

    svg.append('g').attr('class', 'links');
    svg.append('g').attr('class', 'nodes');

    simulation = d3.forceSimulation<PlantNode, GardenLink>()
      .force('link', d3.forceLink<PlantNode, GardenLink>().id((d) => d.id).distance(90).strength((d) => d.strength * 0.4))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<PlantNode>().radius((d) => d.size + 8))
      .on('tick', () => {
        svg!.select('.links').selectAll<SVGLineElement, GardenLink>('line')
          .attr('x1', (d) => (d.source as PlantNode).x ?? 0)
          .attr('y1', (d) => (d.source as PlantNode).y ?? 0)
          .attr('x2', (d) => (d.target as PlantNode).x ?? 0)
          .attr('y2', (d) => (d.target as PlantNode).y ?? 0);
        svg!.select('.nodes').selectAll<SVGGElement, PlantNode>('g.plant')
          .attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
      });
  }

  // --- The agentic loop ---
  async function tendOnce() {
    const gardenJson = serializeGarden(garden);
    const steps = buildTendingChain(gardenJson);
    const result = await runChain(steps);

    if (result.traceId) {
      traceIds = [...traceIds, result.traceId];
    }

    if (result.ok && result.result) {
      const soilResult = result.result as {
        nodes: PlantNode[];
        links: GardenLink[];
        tick: number;
        season: string;
        narration: string;
      };
      currentNarration = soilResult.narration;
      garden = applyResult(garden, soilResult);
      loopCount++;
      renderGarden(garden);
    } else {
      currentNarration = result.error ?? 'Chain failed.';
      garden = {
        ...garden,
        tick: garden.tick + 1,
        log: [...garden.log.slice(-29), `[${garden.tick + 1}] (the gardener couldn't reach the garden)`],
      };
    }
  }

  async function runLoop() {
    running = true;
    paused = false;
    while (running && !paused) {
      await tendOnce();
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  function handleStart() {
    if (garden.nodes.length === 0) {
      garden = seedGarden();
      renderGarden(garden);
    }
    runLoop();
  }

  function handlePause() {
    paused = true;
    running = false;
  }

  function handleReset() {
    handlePause();
    garden = seedGarden();
    traceIds = [];
    loopCount = 0;
    currentNarration = '';
    renderGarden(garden);
  }

  onMount(() => {
    initD3();
    garden = seedGarden();
    renderGarden(garden);
  });
</script>

<SEO
  title="Garden — Lab"
  description="An agent loops over a D3 force graph, tending it one tick at a time. Each cycle is a traced chain: read, decide, apply. The trace is the feedback loop."
  path="/garden"
/>

<div class="max-w-5xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold text-(--text)">Garden</h1>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      An agent in a loop, tending a force-directed graph. Each tick runs a three-step <a href="/docs/trace-schema" class="underline text-(--accent)">chain</a>: read the state, let AI decide one action, apply it. The trace captures every step — what was seen, what was decided, what changed. That's the feedback loop that lets the next tick be smarter.
    </p>
  </header>

  <!-- Controls -->
  <div class="flex items-center gap-3 flex-wrap">
    {#if !running}
      <button
        onclick={handleStart}
        class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        {garden.tick === 0 ? 'Plant & Tend' : 'Resume'}
      </button>
    {:else}
      <button
        onclick={handlePause}
        class="px-4 py-2 rounded-lg bg-(--code-bg) text-(--text) text-sm font-medium border border-(--border) hover:opacity-90 transition-opacity cursor-pointer"
      >
        Pause
      </button>
    {/if}
    <button
      onclick={handleReset}
      class="px-4 py-2 rounded-lg bg-(--code-bg) text-(--text-3) text-sm border border-(--border) hover:opacity-90 transition-opacity cursor-pointer"
    >
      Reset
    </button>

    <span class="text-xs text-(--text-3) ml-auto tabular-nums">
      tick {garden.tick} &middot; {garden.season} &middot; {garden.nodes.length} plants &middot; {garden.links.length} connections
    </span>
  </div>

  <!-- Narration -->
  {#if currentNarration}
    <div class="px-4 py-3 rounded-lg bg-(--code-bg) border border-(--border) text-sm text-(--text-2) italic">
      "{currentNarration}"
    </div>
  {/if}

  <!-- D3 Canvas -->
  <div
    bind:this={container}
    class="w-full rounded-xl border border-(--border) overflow-hidden"
    style="min-height: 500px; aspect-ratio: 4/3;"
  ></div>

  <!-- Log + Traces -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">Garden Log</h2>
      <div class="bg-(--code-bg) border border-(--border) rounded-lg p-3 max-h-60 overflow-y-auto">
        {#each garden.log as entry}
          <p class="text-xs text-(--text-3) leading-relaxed">{entry}</p>
        {/each}
        {#if garden.log.length === 0}
          <p class="text-xs text-(--text-3) italic">Waiting to plant...</p>
        {/if}
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">Traces</h2>
      <div class="bg-(--code-bg) border border-(--border) rounded-lg p-3 max-h-60 overflow-y-auto">
        {#each traceIds as tid, i}
          <a href="/t/{tid}" class="block text-xs text-(--accent) underline leading-relaxed hover:opacity-80">
            Tick {i + 1} &rarr; /t/{tid}
          </a>
        {/each}
        {#if traceIds.length === 0}
          <p class="text-xs text-(--text-3) italic">No traces yet.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Legend -->
  <div class="flex flex-wrap gap-4 text-xs text-(--text-3) pt-2">
    <span class="flex items-center gap-1.5">
      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#8b6914"/></svg> Seed
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#6b8f3c"/></svg> Sprout
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#f5c542"/></svg> Bloom
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#2d5016"/></svg> Tree
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#5a3a1a" opacity="0.4"/></svg> Fallen
    </span>
    <span class="text-(--border)">|</span>
    <span class="flex items-center gap-1.5">
      <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#8b6914" stroke-width="2"/></svg> Roots
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#e8a0bf" stroke-width="2" stroke-dasharray="4,4"/></svg> Pollination
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#4a6741" stroke-width="2"/></svg> Shade
    </span>
    <span class="flex items-center gap-1.5">
      <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#6b8f3c" stroke-width="2"/></svg> Nutrients
    </span>
  </div>
</div>

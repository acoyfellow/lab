<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import SEO from '$lib/SEO.svelte';
  import { runGenerate } from '../data.remote';

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

  // --- State ---
  let container: HTMLDivElement | undefined = $state(undefined);
  let garden = $state<GardenState>({
    nodes: [], links: [], tick: 0, season: 'spring', log: [],
  });
  let running = $state(false);
  let paused = $state(false);
  let traceIds = $state<{ id: string; generated?: string }[]>([]);
  let currentNarration = $state('');
  let lastGenerated = $state('');
  let showCode = $state(false);
  let loopCount = $state(0);
  let runToken = $state(0);
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

  // --- Serialize garden for the prompt ---
  function serializeForPrompt(g: GardenState): string {
    const nodes = g.nodes.map((n) => ({
      id: n.id, type: n.type, age: n.age,
      energy: Math.round(n.energy * 100) / 100,
      color: n.color, size: n.size, label: n.label,
    }));
    const links = g.links.map((l) => ({
      source: typeof l.source === 'object' ? (l.source as PlantNode).id : String(l.source),
      target: typeof l.target === 'object' ? (l.target as PlantNode).id : String(l.target),
      type: l.type, strength: l.strength,
    }));
    return JSON.stringify({ nodes, links, tick: g.tick, season: g.season }, null, 2);
  }

  // ---------------------------------------------------------------
  // The agent writes code. Lab runs it. The trace proves what happened.
  //
  // Each tick:
  //   1. Serialize the garden into a prompt
  //   2. runGenerate — the LLM writes JavaScript
  //   3. Lab runs that code in a fresh isolate
  //   4. Result = new garden state, applied to D3
  //   5. Trace captures: the prompt, the generated code, the result
  //
  // No hand-written chain steps. No JSON schema for the agent to
  // fill in. The agent writes the code. That's the experiment.
  // ---------------------------------------------------------------

  function buildPrompt(gardenJson: string): string {
    return `You are tending a living garden represented as a force-directed graph.

Here is the current garden state:
${gardenJson}

Write JavaScript that reads this state, makes one small tending action, and returns the new state.

Your code receives nothing — the garden state above is your context. Reconstruct it as a variable and work with it directly.

Rules of the garden:
- Nodes are plants with: id, type (seed|sprout|bloom|tree|fallen), age, energy (0-1), color (#hex), size (3-40), label
- Links are relationships with: source (id), target (id), type (roots|pollination|shade|nutrients), strength (0.1-1)
- Seeds sprout near nutrients/shade. Sprouts become blooms. Blooms become trees. This takes many ticks.
- Low-energy plants become "fallen". Fallen plants get removed.
- New seeds can appear naturally. Not every tick.
- Connections: pollination (bloom↔bloom), shade (tree→smaller), roots (any), nutrients (any)
- Seasons rotate every ~4 ticks: spring→summer→autumn→winter→spring
- Spring: +energy, new seeds. Summer: peak energy. Autumn: -energy, things fall. Winter: dormancy, death.
- Isolated plants (no connections) lose energy faster.

Be restrained — one or two small changes per tick. Let the garden evolve slowly.

Your code MUST return an object with this exact shape:
{
  nodes: [...],     // the full updated nodes array
  links: [...],     // the full updated links array (source/target as string ids)
  tick: <number>,   // current tick + 1
  season: <string>, // current or next season
  narration: <string> // a short poetic sentence about what you did
}

Write only the JavaScript body. No markdown. No explanation. Just code that returns the new state.`;
  }

  // --- Apply generate result back to the garden ---
  function applyResult(g: GardenState, result: { nodes: PlantNode[]; links: GardenLink[]; tick: number; season: string; narration: string }): GardenState {
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

    nodeEnter.append('circle').attr('class', 'glow');
    nodeEnter.append('circle').attr('class', 'core');
    nodeEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-3)')
      .attr('font-size', '9px')
      .attr('pointer-events', 'none');

    nodeEnter.transition().duration(800).style('opacity', '1');

    const merged = nodeSel.merge(nodeEnter);

    merged.select('.glow')
      .transition().duration(600)
      .attr('r', (d: PlantNode) => d.size + 4 + d.energy * 6)
      .attr('fill', 'none')
      .attr('stroke', (d: PlantNode) => d.color)
      .attr('stroke-width', (d: PlantNode) => d.energy * 2)
      .attr('opacity', (d: PlantNode) => d.type === 'fallen' ? 0 : d.energy * 0.25);

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

  // --- Validate the shape of generated state ---
  function isValidGardenResult(v: unknown): v is { nodes: PlantNode[]; links: GardenLink[]; tick: number; season: string; narration: string } {
    if (typeof v !== 'object' || v === null) return false;
    const o = v as Record<string, unknown>;
    if (!Array.isArray(o.nodes) || !Array.isArray(o.links)) return false;
    if (typeof o.tick !== 'number' || typeof o.season !== 'string') return false;
    // Spot-check first node has required fields
    if (o.nodes.length > 0) {
      const n = o.nodes[0] as Record<string, unknown>;
      if (typeof n.id !== 'string' || typeof n.type !== 'string' || typeof n.energy !== 'number') return false;
    }
    return true;
  }

  // --- The agentic loop ---
  async function tendOnce(token: number) {
    const gardenJson = serializeForPrompt(garden);
    const prompt = buildPrompt(gardenJson);

    const result = await runGenerate({
      prompt,
      capabilities: [],
    });

    // Stale result — user paused or reset while we were waiting
    if (token !== runToken) return;

    if (result.traceId) {
      traceIds = [...traceIds, { id: result.traceId, generated: result.generated }];
    }

    if (result.generated) {
      lastGenerated = result.generated;
    }

    if (result.ok && isValidGardenResult(result.result)) {
      currentNarration = result.result.narration ?? '';
      garden = applyResult(garden, result.result);
      loopCount++;
      renderGarden(garden);
    } else {
      const reason = !result.ok
        ? (result.error ?? 'unknown')
        : 'agent returned invalid shape';
      currentNarration = reason;
      lastGenerated = result.generated ?? '';
      garden = {
        ...garden,
        tick: garden.tick + 1,
        log: [...garden.log.slice(-29), `[${garden.tick + 1}] (code failed: ${reason})`],
      };
    }
  }

  async function runLoop() {
    running = true;
    paused = false;
    const token = ++runToken;
    while (running && !paused && token === runToken) {
      await tendOnce(token);
      if (token !== runToken) break;
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
    runToken++;
    garden = seedGarden();
    traceIds = [];
    loopCount = 0;
    currentNarration = '';
    lastGenerated = '';
    showCode = false;
    renderGarden(garden);
  }

  onMount(() => {
    initD3();
    garden = seedGarden();
    renderGarden(garden);

    return () => {
      running = false;
      paused = true;
      runToken++;
      if (simulation) {
        simulation.stop();
        simulation = null;
      }
    };
  });
</script>

<SEO
  title="Garden — Lab"
  description="An agent writes JavaScript to tend a living graph. Lab runs the code in a fresh isolate each tick. The trace shows what code was written and what it did."
  path="/garden"
/>

<div class="max-w-5xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold text-(--text)">Garden</h1>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      Each tick, an agent sees the garden and writes JavaScript to tend it. Lab runs that code in a fresh isolate. The <a href="/docs/trace-schema" class="underline text-(--accent)">trace</a> captures the prompt, the generated code, and the result. No hand-written logic — the agent writes the code.
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

    {#if lastGenerated}
      <button
        onclick={() => showCode = !showCode}
        class="px-3 py-2 rounded-lg bg-(--code-bg) text-(--text-3) text-xs border border-(--border) hover:opacity-90 transition-opacity cursor-pointer"
      >
        {showCode ? 'Hide code' : 'Show code'}
      </button>
    {/if}

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

  <!-- Generated code viewer -->
  {#if showCode && lastGenerated}
    <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden">
      <div class="px-3 py-2 border-b border-(--border) flex items-center justify-between">
        <span class="text-xs text-(--text-3)">Agent-generated code (tick {garden.tick})</span>
      </div>
      <pre class="p-3 text-xs text-(--text-2) overflow-x-auto max-h-80 overflow-y-auto leading-relaxed"><code>{lastGenerated}</code></pre>
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
        {#each traceIds as trace, i}
          <a href="/t/{trace.id}" class="block text-xs text-(--accent) underline leading-relaxed hover:opacity-80">
            Tick {i + 1} &rarr; /t/{trace.id}
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

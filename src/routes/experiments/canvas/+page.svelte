<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import SEO from '$lib/SEO.svelte';
  import AuthButton from '$lib/components/AuthButton.svelte';
  import { runGenerate } from '../../data.remote';

  let authed = $derived(!!page.data.experimentAuth?.authenticated);
  let showAuthGate = $state(false);

  // The model sees the real board state and decides its move
  // No hidden logic — just structured JSON output driving the game

  type Cell = { x: number; y: number; player: 'X' | 'O' | null };
  
  let canvas: HTMLCanvasElement = undefined!;
  let ctx: CanvasRenderingContext2D;
  let cells: Cell[] = $state([]);
  let gameOver = $state(false);
  let winner = $state<string | null>(null);
  let winLine = $state<number[]>([]);
  let waiting = $state(false);
  let lastTraceId = $state<string | null>(null);
  let agentCode = $state<string>('');
  let agentReason = $state<string>('');
  let status = $state<string>('Click a square to play X');
  let playStyle = $state('strategic');

  const PLAY_STYLES: Record<string, { label: string; prompt: string }> = {
    strategic: { label: 'Strategic', prompt: 'Play optimally. Win if you can, block if you must, take center, then corners.' },
    aggressive: { label: 'Aggressive', prompt: 'Play to WIN. Prioritize offense over defense. Take risks. Ignore blocks unless forced.' },
    defensive: { label: 'Defensive', prompt: 'Play ultra-safe. Always block threats first. Never take risks. Prefer center and edges.' },
    chaotic: { label: 'Chaotic', prompt: 'Play unpredictably. Pick surprising moves. Avoid the obvious choice. Be weird.' },
    drunk: { label: 'Drunk', prompt: 'You are very drunk. You TRY to play well but sometimes pick a random empty cell instead. About 40% chance of a bad move.' },
    troll: { label: 'Troll', prompt: 'You are trolling. Make the WORST possible move on purpose. Help X win. Pick the cell that helps X the most.' },
  };

  const GRID_SIZE = 3;
  const CANVAS_SIZE = 600; // internal resolution (renders crisp on retina)
  const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
  let wrapperEl = $state<HTMLDivElement | undefined>(undefined);

  function initGame() {
    cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        cells.push({
          x: col,
          y: row,
          player: null
        });
      }
    }
    gameOver = false;
    winner = null;
    winLine = [];
    agentReason = '';
    agentCode = '';
    status = 'Click a square to play X';
    draw();
  }

  function draw() {
    if (!ctx) return;
    
    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Highlight winning cells
    if (winLine.length) {
      const winColor = winner === 'X' ? 'rgba(245, 197, 66, 0.15)' : 'rgba(74, 124, 41, 0.15)';
      for (const idx of winLine) {
        const cell = cells[idx];
        ctx.fillStyle = winColor;
        ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }

      // Draw a line through the winning cells
      const first = cells[winLine[0]];
      const last = cells[winLine[2]];
      const x1 = first.x * CELL_SIZE + CELL_SIZE / 2;
      const y1 = first.y * CELL_SIZE + CELL_SIZE / 2;
      const x2 = last.x * CELL_SIZE + CELL_SIZE / 2;
      const y2 = last.y * CELL_SIZE + CELL_SIZE / 2;
      ctx.strokeStyle = winner === 'X' ? '#f5c542' : '#4a7c29';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // Draw X's and O's
    for (const cell of cells) {
      if (!cell.player) continue;
      
      const cx = cell.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = cell.y * CELL_SIZE + CELL_SIZE / 2;
      const padding = CELL_SIZE * 0.2;

      if (cell.player === 'X') {
        ctx.strokeStyle = '#f5c542';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - padding, cy - padding);
        ctx.lineTo(cx + padding, cy + padding);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + padding, cy - padding);
        ctx.lineTo(cx - padding, cy + padding);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#4a7c29';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, padding, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function getWinner(): string | null {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (cells[a].player && cells[a].player === cells[b].player && cells[a].player === cells[c].player) {
        winLine = line;
        return cells[a].player;
      }
    }

    if (cells.every(c => c.player)) return 'draw';
    return null;
  }

  async function playAgent() {
    if (gameOver) return;
    
    waiting = true;
    status = 'Agent is thinking...';

    const emptyCells = cells.filter(c => !c.player);
    const visual = [0,1,2].map(r =>
      `  ${cells.slice(r*3, r*3+3).map(c => c.player ?? '.').join(' ')}   (y=${r})`
    ).join('\n');

    // Pre-compute threats so the LLM can't miss them
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    function findThreat(player: string): Cell | null {
      for (const [a,b,c] of lines) {
        const tri = [cells[a], cells[b], cells[c]];
        const mine = tri.filter(t => t.player === player);
        const empty = tri.filter(t => !t.player);
        if (mine.length === 2 && empty.length === 1) return empty[0];
      }
      return null;
    }
    const winMove = findThreat('O');
    const blockMove = findThreat('X');

    let hint = '';
    if (winMove) hint = `\nYou can WIN at (${winMove.x},${winMove.y}). Play there.`;
    else if (blockMove) hint = `\nX threatens to win at (${blockMove.x},${blockMove.y}). BLOCK there.`;

    const style = PLAY_STYLES[playStyle];
    const prompt = `Tic-tac-toe. You are O. ${style.prompt}

  x=0 x=1 x=2
${visual}

Empty: ${emptyCells.map(c => `(${c.x},${c.y})`).join(' ')}
${hint}
Return JSON: {"x": <col 0-2>, "y": <row 0-2>, "r": "<why>"}`;

    try {
      const result = await runGenerate({
        prompt,
        mode: 'json',
        capabilities: [],
        input: { cells }
      });

      agentCode = result.generated ?? '';
      lastTraceId = result.traceId ?? null;

      const move = (result.ok ? result.result : null) as { x: number; y: number; r?: string } | null;

      if (move && typeof move.x === 'number' && typeof move.y === 'number') {
        agentReason = move.r ?? '';
        const cell = cells.find(c => c.x === move.x && c.y === move.y && !c.player);

        if (cell) {
          cell.player = 'O';
          status = `Agent played O at (${move.x}, ${move.y})`;

          const win = getWinner();
          if (win) {
            gameOver = true;
            winner = win;
            status = win === 'draw' ? "It's a draw!" : `${win} wins!`;
          } else {
            status = 'Your turn (X)';
          }
        } else {
          status = `Agent tried occupied cell (${move.x}, ${move.y})`;
        }
      } else {
        status = `Agent error: ${result.error ?? 'bad response'}`;
      }
    } catch (e) {
      status = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    waiting = false;
    draw();
  }

  function handleClick(e: MouseEvent) {
    if (!authed) { showAuthGate = true; return; }
    if (waiting || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / CELL_SIZE);

    const cell = cells.find(c => c.x === x && c.y === y && !c.player);
    if (!cell) return;

    cell.player = 'X';
    status = 'You played X';
    
    const win = getWinner();
    if (win) {
      gameOver = true;
      winner = win;
      status = win === 'draw' ? "It's a draw!" : `${win} wins!`;
      draw();
      return;
    }

    draw();
    void playAgent();
  }

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    initGame();
  });
</script>

<SEO title="Tic-Tac-Toe — Lab" description="Play tic-tac-toe against an LLM. It sees the board, picks a move, and explains why." path="/experiments/canvas" />

<div class="max-w-3xl mx-auto px-6 py-10 max-sm:px-4 max-sm:py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold tracking-tight text-(--text)">Tic-Tac-Toe</h1>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      You play X, the agent plays O. Each turn, the LLM receives the actual board state as structured input, returns its move as JSON, and the board updates. No tricks, no hardcoded AI — just a model reading the truth of the game and responding.
    </p>
  </header>

  {#if showAuthGate}
    <div class="rounded-lg border border-(--border) bg-(--surface) px-5 py-4 max-w-md space-y-3 text-center">
      <p class="text-sm text-(--text-2)">Sign in with GitHub to play. Experiments use LLM calls that cost real money.</p>
      <div class="flex justify-center">
        <AuthButton />
      </div>
    </div>
  {/if}

  <div class="flex items-center gap-3 flex-wrap">
    <button onclick={initGame} class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
      New Game
    </button>
    <select bind:value={playStyle} class="px-3 py-2 rounded-lg bg-(--code-bg) text-(--text) text-sm border border-(--border) cursor-pointer">
      {#each Object.entries(PLAY_STYLES) as [key, style]}
        <option value={key}>{style.label}</option>
      {/each}
    </select>
    <span class="text-sm text-(--text-2)">{status}</span>
  </div>

  <div bind:this={wrapperEl} class="w-full">
    <canvas
      bind:this={canvas}
      onclick={handleClick}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      class="rounded-xl border border-(--border) cursor-pointer w-full"
      style="aspect-ratio: 1; display: block;"
    ></canvas>
  </div>

  {#if agentReason}
    <div class="rounded-lg bg-(--code-bg) border border-(--border) px-4 py-3">
      <p class="text-sm text-(--text-2) italic">"{agentReason}"</p>
    </div>
  {/if}

  {#if agentCode}
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">Agent Response</h2>
      <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden">
        <pre class="p-3 text-xs text-(--text-2) overflow-x-auto"><code>{agentCode}</code></pre>
      </div>
      {#if lastTraceId}
        <a href="/t/{lastTraceId}" class="text-xs text-(--accent) underline hover:opacity-80">
          View trace /t/{lastTraceId}
        </a>
      {/if}
    </div>
  {/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { runGenerate } from '../../data.remote';

  // Kenton's insight: the model inhabits the canvas state
  // User draws X, model reads strokes and writes O back
  // No separate app - just state + code

  type Cell = { x: number; y: number; player: 'X' | 'O' | null };
  
  let canvas: HTMLCanvasElement = undefined!;
  let ctx: CanvasRenderingContext2D;
  let cells: Cell[] = $state([]);
  let gameOver = $state(false);
  let winner = $state<string | null>(null);
  let waiting = $state(false);
  let lastTraceId = $state<string | null>(null);
  let agentCode = $state<string>('');
  let status = $state<string>('Click a square to play X');

  const GRID_SIZE = 3;
  const CANVAS_SIZE = 300;
  const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

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

  function getWinner(): string | null {
    const lines = [
      // Rows
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      // Cols
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      // Diagonals
      [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
      if (cells[a].player && cells[a].player === cells[b].player && cells[a].player === cells[c].player) {
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

    const prompt = `You are playing tic-tac-toe. The board is a 3x3 grid.

Input provides:
- cells: array of {x, y, player} where player is 'X', 'O', or null
- emptyCells: array of cells with no player

Your task: Write JavaScript that finds the best move for O and returns it.

Return format: { x: number, y: number }

Strategy:
1. If you can win, take that move
2. If X can win next turn, block it
3. Take center if available
4. Take a corner
5. Take any available spot

Output ONLY the JavaScript code. No markdown, no explanation.
The last line should evaluate to {x, y}.`;

    try {
      const result = await runGenerate({
        prompt,
        mode: 'code',
        capabilities: [],
        input: {
          cells,
          emptyCells: cells.filter(c => !c.player)
        }
      });

      agentCode = result.generated ?? '';
      lastTraceId = result.traceId ?? null;

      if (result.ok && result.result && typeof result.result === 'object') {
        const move = result.result as { x: number; y: number };
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
          status = 'Agent tried invalid move';
        }
      } else {
        status = `Agent error: ${result.error ?? 'unknown'}`;
      }
    } catch (e) {
      status = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    waiting = false;
    draw();
  }

  function handleClick(e: MouseEvent) {
    if (waiting || gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

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

<SEO title="Canvas — Lab" description="Tic-tac-toe on canvas. The agent reads state and writes back." path="/experiments/canvas" />

<div class="max-w-2xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold text-(--text)">Canvas</h1>
    <p class="text-sm text-(--text-3) max-w-xl leading-relaxed">
      Kenton's insight: the model <em>inhabits</em> the canvas state. You draw X, the agent reads the representation and writes O back.
      No app generation—just state and code.
    </p>
  </header>

  <div class="flex items-center gap-3">
    <button onclick={initGame} class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer">
      New Game
    </button>
    <span class="text-sm text-(--text-2)">{status}</span>
  </div>

  <div class="flex justify-center">
    <canvas
      bind:this={canvas}
      onclick={handleClick}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      class="rounded-xl border border-(--border) cursor-pointer"
      style="max-width: 100%;"
    ></canvas>
  </div>

  {#if agentCode}
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">Agent Code</h2>
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

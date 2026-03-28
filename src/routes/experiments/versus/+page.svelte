<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import SEO from '$lib/SEO.svelte';
  import AuthButton from '$lib/components/AuthButton.svelte';
  import {
    createBoard,
    cloneBoard,
    dropPiece,
    checkWin,
    isDraw,
    getValidColumns,
    type Board,
  } from '../drop-four/game';
  import { drawChallengeBoard, hitTestColumn } from '../drop-four/render';
  import { aiMove } from './ai';
  import { doSqlQuery, doSqlExec } from '../../data.remote';

  let authed = $derived(!!page.data.experimentAuth?.authenticated);
  let showAuthGate = $state(false);

  const DO_NAME = 'versus';

  let canvas: HTMLCanvasElement = undefined!;
  let ctx: CanvasRenderingContext2D;
  const W = 700;
  const H = 650;

  let board = $state<Board>(createBoard());
  let gameOver = $state(false);
  let winner = $state<string | null>(null);
  let winCells = $state<[number, number][] | null>(null);
  let waiting = $state(false);
  type AiState = 'ready' | 'thinking' | 'win' | 'lose' | 'draw' | 'error';
  let aiState = $state<AiState>('ready');
  let errorMsg = $state('');
  let reason = $state('');
  let generated = $state('');
  let hoverCol = $state<number | null>(null);

  type TraceLog = { turn: number; col: number; reason: string; traceId: string | null; generated: string };
  let traces = $state<TraceLog[]>([]);
  let turnCount = $state(0);
  let gameId = $state(crypto.randomUUID());

  // Learning loop state
  let insights = $state<string[]>([]);
  type GameRecord = { id: string; outcome: string; moves: number; trace_ids: string; insight: string | null; created_at: string };
  let pastGames = $state<GameRecord[]>([]);
  let expandedGame = $state<string | null>(null);

  async function loadInsights() {
    try {
      const result = await doSqlQuery({
        doName: DO_NAME,
        sql: 'SELECT * FROM games ORDER BY created_at DESC LIMIT 20',
      });
      if (result.ok) {
        pastGames = result.rows as GameRecord[];
        insights = pastGames
          .filter(g => g.insight)
          .map(g => g.insight!);
      }
    } catch (e) {
      console.error('loadInsights failed:', e);
    }
  }

  async function saveGame(outcome: 'win' | 'loss' | 'draw') {
    // Only store games with enough moves to be meaningful
    if (turnCount < 4) return;
    const traceIds = traces.map(t => t.traceId).filter(Boolean);
    if (traceIds.length === 0) return;
    try {
      await doSqlExec({
        doName: DO_NAME,
        sql: 'INSERT INTO games (id, outcome, moves, trace_ids, insight) VALUES (?, ?, ?, ?, ?)',
        params: [gameId, outcome, turnCount, JSON.stringify(traceIds), null],
      });
      void generateInsight(outcome);
    } catch {
      // Best effort — don't break the game
    }
  }

  async function generateInsight(outcome: 'win' | 'loss' | 'draw') {
    // Use the existing runGenerate to get a 1-line insight about what happened
    const { runGenerate } = await import('../../data.remote');
    const moveSummary = traces.map(t => `T${t.turn}:col${t.col}`).join(' ');
    const result = await runGenerate({
      prompt: `Connect 4 game result: AI ${outcome}. Moves: ${moveSummary}. One sentence: what pattern should AI remember?`,
      mode: 'json',
      capabilities: [],
      model: '@cf/zai-org/glm-4.7-flash',
      input: {},
    });

    const parsed = result.ok ? (result.result as { r?: string } | null) : null;
    const insight = parsed?.r;
    if (insight) {
      await doSqlExec({
        doName: DO_NAME,
        sql: 'UPDATE games SET insight = ? WHERE id = ?',
        params: [insight, gameId],
      }).catch(() => {});
    }
  }

  function draw() {
    if (!ctx) return;
    drawChallengeBoard(ctx, board, W, H, winCells, hoverCol, 'Y');
  }

  function requireAuth(): boolean {
    if (authed) return true;
    showAuthGate = true;
    return false;
  }

  function initGame() {
    if (!requireAuth()) return;
    board = createBoard();
    gameOver = false;
    winner = null;
    winCells = null;
    waiting = false;
    aiState = 'ready';
    errorMsg = '';
    reason = '';
    generated = '';
    traces = [];
    turnCount = 0;
    gameId = crypto.randomUUID();
    void loadInsights();
    draw();
  }

  async function playAi() {
    if (gameOver) return;
    waiting = true;
    aiState = 'thinking';
    hoverCol = null;
    draw();

    try {
      const result = await aiMove(board, 'R', insights);
      reason = result.reason;
      generated = result.generated;

      const valid = getValidColumns(board);
      const col = valid.includes(result.col) ? result.col : valid[Math.floor(Math.random() * valid.length)];

      turnCount++;
      traces.push({
        turn: turnCount,
        col,
        reason: result.reason,
        traceId: result.traceId,
        generated: result.generated,
      });

      const next = cloneBoard(board);
      dropPiece(next, col, 'R');
      board = next;

      const win = checkWin(board);
      if (win) {
        gameOver = true;
        winner = 'AI';
        winCells = win.cells;
        aiState = 'win';
        void saveGame('win');
      } else if (isDraw(board)) {
        gameOver = true;
        winner = 'draw';
        aiState = 'draw';
        void saveGame('draw');
      } else {
        aiState = 'ready';
      }
    } catch (e) {
      aiState = 'error';
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    waiting = false;
    draw();
  }

  function handleClick(e: MouseEvent) {
    if (!requireAuth()) return;
    if (waiting || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * (H / rect.height);
    const col = hitTestColumn(W, H, clickX, clickY);
    if (col == null || !getValidColumns(board).includes(col)) return;

    const next = cloneBoard(board);
    dropPiece(next, col, 'Y');
    board = next;

    const win = checkWin(board);
    if (win) {
      gameOver = true;
      winner = 'You';
      winCells = win.cells;
      aiState = 'lose';
      void saveGame('loss');
      draw();
      return;
    }
    if (isDraw(board)) {
      gameOver = true;
      winner = 'draw';
      aiState = 'draw';
      void saveGame('draw');
      draw();
      return;
    }

    draw();
    void playAi();
  }

  function handleHover(e: MouseEvent) {
    if (waiting || gameOver) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    hoverCol = hitTestColumn(W, H, (e.clientX - rect.left) * scaleX, 0);
    draw();
  }

  function handleLeave() {
    hoverCol = null;
    draw();
  }

  $effect(() => {
    void board;
    void winCells;
    void hoverCol;
    draw();
  });

  onMount(() => {
    ctx = canvas.getContext('2d')!;
    draw();
    void loadInsights();
  });
</script>

<SEO
  title="Versus — Lab"
  description="1v1 Connect 4 against an AI that learns from past games. Tactics are algorithmic. Preference is LLM. Every move is traced."
  path="/experiments/versus"
/>

<div class="max-w-3xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold text-(--text)">Versus</h1>
    <p class="text-sm text-(--text-3) max-w-2xl leading-relaxed">
      The AI plays Connect 4 using minimax search — no prompt engineering, no strategy instructions. When multiple moves are equally strong, a small LLM picks its preference from a minimal prompt: just the board state and one-line insights from past losses. It gets smarter between games, not between tokens. Every move produces a trace so you can see exactly what the algorithm decided vs. what the LLM influenced.
    </p>
  </header>

  <div class="flex items-center gap-3">
    <button
      onclick={initGame}
      class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
    >
      New Game
    </button>
    <div class="flex items-center gap-2 text-sm">
      {#if aiState === 'thinking'}
        <svg class="w-4 h-4 animate-spin text-(--accent)" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4 31.4" stroke-linecap="round" />
        </svg>
        <span class="text-(--text-2)">Thinking</span>
      {:else if aiState === 'win'}
        <svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z"/><rect x="11" y="10" width="2" height="4"/><rect x="11" y="15" width="2" height="2"/></svg>
        <span class="text-red-500 font-medium">AI wins</span>
      {:else if aiState === 'lose'}
        <svg class="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        <span class="text-green-500 font-medium">You win</span>
      {:else if aiState === 'draw'}
        <svg class="w-4 h-4 text-(--text-3)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span class="text-(--text-2)">Draw</span>
      {:else if aiState === 'error'}
        <svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span class="text-red-500 text-xs">{errorMsg}</span>
      {:else}
        <svg class="w-4 h-4 text-(--accent)" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
        <span class="text-(--text-2)">Your turn</span>
      {/if}
    </div>
    {#if insights.length > 0}
      <span class="text-xs text-(--text-3)">{insights.length} insights loaded</span>
    {/if}
  </div>

  {#if showAuthGate}
    <div class="rounded-lg border border-(--border) bg-(--surface) px-5 py-4 max-w-md space-y-3 text-center">
      <p class="text-sm text-(--text-2)">Sign in with GitHub to play. Experiments use LLM calls that cost real money.</p>
      <div class="flex justify-center">
        <AuthButton />
      </div>
    </div>
  {/if}

  <div class="w-full max-w-2xl">
    <canvas
      bind:this={canvas}
      width={W}
      height={H}
      onclick={handleClick}
      onmousemove={handleHover}
      onmouseleave={handleLeave}
      class="rounded-xl border border-(--border) cursor-pointer w-full"
      style="aspect-ratio: {W}/{H}; display: block;"
    ></canvas>
  </div>

  {#if reason}
    <div class="rounded-lg bg-(--code-bg) border border-(--border) px-4 py-3 max-w-2xl">
      <p class="text-sm text-(--text-2) italic">"{reason}"</p>
    </div>
  {/if}

  {#if generated}
    <div class="space-y-2 max-w-2xl">
      <h2 class="text-sm font-medium text-(--text-2)">Generated</h2>
      <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden">
        <pre class="p-3 text-xs text-(--text-2) overflow-x-auto max-h-64 overflow-y-auto"><code>{generated}</code></pre>
      </div>
    </div>
  {/if}

  {#if traces.length > 0}
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">
        Trace Log ({traces.length} moves)
      </h2>
      <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden max-h-64 overflow-y-auto">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-(--code-bg)">
            <tr class="border-b border-(--border) text-(--text-3)">
              <th class="text-left px-2 py-1.5 font-medium">Turn</th>
              <th class="text-left px-2 py-1.5 font-medium">Col</th>
              <th class="text-left px-2 py-1.5 font-medium">Reason</th>
              <th class="text-left px-2 py-1.5 font-medium">Trace</th>
            </tr>
          </thead>
          <tbody>
            {#each traces as t}
              <tr class="border-b border-(--border) last:border-0 text-(--text-2)">
                <td class="px-2 py-1">{t.turn}</td>
                <td class="px-2 py-1">{t.col}</td>
                <td class="px-2 py-1 max-w-64 truncate">{t.reason || '—'}</td>
                <td class="px-2 py-1">
                  {#if t.traceId}
                    <a href="/t/{t.traceId}" class="text-(--accent) underline hover:opacity-80">{t.traceId.slice(0, 8)}</a>
                  {:else}
                    —
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if pastGames.length > 0}
    <div class="space-y-2">
      <h2 class="text-sm font-medium text-(--text-2)">
        Game History ({pastGames.length} games)
      </h2>
      <div class="space-y-1.5">
        {#each pastGames as g}
          {@const expanded = expandedGame === g.id}
          {@const traceIds = (() => { try { return JSON.parse(g.trace_ids || '[]') as string[] } catch { return [] } })()}
          <button
            onclick={() => expandedGame = expanded ? null : g.id}
            class="w-full text-left rounded-lg bg-(--code-bg) border border-(--border) px-3 py-2 hover:border-(--accent)/40 transition-colors cursor-pointer"
          >
            <div class="flex items-center gap-3 text-xs">
              <span class={g.outcome === 'win' ? 'text-green-500 font-medium' : g.outcome === 'loss' ? 'text-red-500 font-medium' : 'text-(--text-3) font-medium'}>
                {g.outcome === 'win' ? 'AI won' : g.outcome === 'loss' ? 'AI lost' : 'Draw'}
              </span>
              <span class="text-(--text-3)">{g.moves} moves</span>
              <span class="text-(--text-2) truncate flex-1">{g.insight || '—'}</span>
              <span class="text-(--text-3) flex-shrink-0">{g.created_at?.slice(0, 10) ?? ''}</span>
              <svg class="w-3 h-3 text-(--text-3) transition-transform flex-shrink-0 {expanded ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </button>
          {#if expanded}
            <div class="rounded-lg bg-(--code-bg) border border-(--border) px-3 py-2.5 ml-2 space-y-2 text-xs">
              {#if g.insight}
                <div>
                  <div class="text-(--text-3) font-medium mb-0.5">Insight</div>
                  <p class="text-(--text-2) m-0">{g.insight}</p>
                </div>
              {/if}
              {#if traceIds.length > 0}
                <div>
                  <div class="text-(--text-3) font-medium mb-0.5">Traces ({traceIds.length})</div>
                  <div class="flex flex-wrap gap-1.5">
                    {#each traceIds as tid}
                      <a href="/t/{tid}" class="text-(--accent) underline hover:opacity-80">{tid.slice(0, 8)}</a>
                    {/each}
                  </div>
                </div>
              {/if}
              <div class="flex gap-4 text-(--text-3)">
                <span>ID: {g.id.slice(0, 8)}</span>
                <span>{g.created_at}</span>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

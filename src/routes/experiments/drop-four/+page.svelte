<script lang="ts">
  import { onMount } from 'svelte';
  import SEO from '$lib/SEO.svelte';
  import { runGenerate } from '../../data.remote';
  import {
    createBoard,
    cloneBoard,
    dropPiece,
    checkWin,
    isDraw,
    getValidColumns,
    findThreats,
    boardToAscii,
    PLAY_STYLES,
    type Board,
    type Player,
  } from './game';
  import {
    tournament,
    runTournament,
    resetTournament,
    type MatchState,
  } from './tournament.svelte';
  import {
    drawStartScreen,
    drawTournamentGrid,
    drawChallengeBoard,
    hitTestColumn,
    type MatchView,
  } from './render';

  const AI_MODEL = '@cf/zai-org/glm-4.7-flash';

  // --- View state ---
  let view = $state<'tournament' | 'challenge'>('tournament');

  // --- Tournament canvas ---
  let tournCanvas: HTMLCanvasElement = undefined!;
  let tournCtx: CanvasRenderingContext2D;
  const TOURN_W = 1000;
  const TOURN_H = 520;

  // --- Challenge state ---
  let chalCanvas: HTMLCanvasElement = undefined!;
  let chalCtx: CanvasRenderingContext2D;
  const CHAL_W = 700;
  const CHAL_H = 650;
  let chalBoard = $state<Board>(createBoard());
  let chalGameOver = $state(false);
  let chalWinner = $state<string | null>(null);
  let chalWinCells = $state<[number, number][] | null>(null);
  let chalWaiting = $state(false);
  let chalStatus = $state('Drop a piece to play');
  let chalReason = $state('');
  let chalHoverCol = $state<number | null>(null);
  let lastTraceId = $state<string | null>(null);

  // --- Tournament rendering ---
  function drawTourn() {
    if (!tournCtx) return;
    const views: MatchView[] = tournament.matches.map((m: MatchState) => ({
      p1Label: PLAY_STYLES[m.p1]?.label ?? m.p1,
      p2Label: PLAY_STYLES[m.p2]?.label ?? m.p2,
      board: m.board,
      status: m.status,
      winCells: m.winCells,
      winnerLabel: m.winner && m.winner !== 'draw'
        ? (PLAY_STYLES[m.winner]?.label ?? m.winner)
        : null,
    }));
    drawTournamentGrid(tournCtx, views, TOURN_W, TOURN_H);
  }

  // --- Challenge rendering ---
  function drawChal() {
    if (!chalCtx) return;
    drawChallengeBoard(
      chalCtx, chalBoard, CHAL_W, CHAL_H,
      chalWinCells, chalHoverCol, 'Y',
    );
  }

  // --- Challenge game ---
  function initChallenge() {
    chalBoard = createBoard();
    chalGameOver = false;
    chalWinner = null;
    chalWinCells = null;
    chalWaiting = false;
    chalReason = '';
    chalStatus = 'Your turn — drop Yellow';
    lastTraceId = null;
    drawChal();
  }

  async function chalPlayAgent() {
    if (chalGameOver) return;
    chalWaiting = true;
    chalStatus = 'Champion is thinking...';
    drawChal();

    const valid = getValidColumns(chalBoard);
    const myThreats = findThreats(chalBoard, 'R');
    const oppThreats = findThreats(chalBoard, 'Y');

    let hint = '';
    if (myThreats.length) hint = `\nYou can WIN by dropping in column ${myThreats[0]}. Play there.`;
    else if (oppThreats.length) hint = `\nOpponent wins at column ${oppThreats.join(' or ')}. BLOCK.`;

    const styleKey = tournament.champion ?? 'strategic';
    const style = PLAY_STYLES[styleKey];
    const prompt = `Connect 4. You are R (the champion). ${style.prompt}

${boardToAscii(chalBoard)}

Valid columns: ${valid.join(' ')}${hint}
Return JSON: {"col": <0-6>, "r": "<why>"}`;

    try {
      const result = await runGenerate({
        prompt,
        mode: 'json',
        capabilities: [],
        model: AI_MODEL,
        input: { board: chalBoard },
      });

      lastTraceId = result.traceId ?? null;
      const parsed = (result.ok ? result.result : null) as { col: number; r?: string } | null;
      let col = parsed?.col;
      chalReason = parsed?.r ?? '';

      if (typeof col !== 'number' || !valid.includes(col)) {
        col = valid[Math.floor(Math.random() * valid.length)];
      }

      if (col == null) {
        chalStatus = 'Agent error: no valid moves';
        chalWaiting = false;
        return;
      }

      const next = cloneBoard(chalBoard);
      dropPiece(next, col, 'R');
      chalBoard = next;

      const win = checkWin(chalBoard);
      if (win) {
        chalGameOver = true;
        chalWinner = 'Champion';
        chalWinCells = win.cells;
        chalStatus = `Champion (${style.label}) wins!`;
      } else if (isDraw(chalBoard)) {
        chalGameOver = true;
        chalWinner = 'draw';
        chalStatus = "It's a draw!";
      } else {
        chalStatus = 'Your turn — drop Yellow';
      }
    } catch (e) {
      chalStatus = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    chalWaiting = false;
    drawChal();
  }

  function handleChalClick(e: MouseEvent) {
    if (chalWaiting || chalGameOver) return;
    const rect = chalCanvas.getBoundingClientRect();
    const scaleX = CHAL_W / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * (CHAL_H / rect.height);
    const col = hitTestColumn(CHAL_W, CHAL_H, clickX, clickY);
    if (col == null || !getValidColumns(chalBoard).includes(col)) return;

    const next = cloneBoard(chalBoard);
    dropPiece(next, col, 'Y');
    chalBoard = next;

    const win = checkWin(chalBoard);
    if (win) {
      chalGameOver = true;
      chalWinner = 'You';
      chalWinCells = win.cells;
      chalStatus = 'You win!';
      drawChal();
      return;
    }
    if (isDraw(chalBoard)) {
      chalGameOver = true;
      chalWinner = 'draw';
      chalStatus = "It's a draw!";
      drawChal();
      return;
    }

    drawChal();
    void chalPlayAgent();
  }

  function handleChalHover(e: MouseEvent) {
    if (chalWaiting || chalGameOver) return;
    const rect = chalCanvas.getBoundingClientRect();
    const scaleX = CHAL_W / rect.width;
    const clickX = (e.clientX - rect.left) * scaleX;
    chalHoverCol = hitTestColumn(CHAL_W, CHAL_H, clickX, 0);
    drawChal();
  }

  function handleChalLeave() {
    chalHoverCol = null;
    drawChal();
  }

  // --- Reactive redraws ---
  $effect(() => {
    if (view === 'tournament' && tournament.matches.length > 0) {
      void tournament.gamesComplete;
      void tournament.matches.map(m => m.status + m.moves);
      drawTourn();
    }
  });

  $effect(() => {
    if (view === 'challenge') {
      void chalBoard;
      void chalWinCells;
      void chalHoverCol;
      drawChal();
    }
  });

  // --- Start screen animation ---
  let startFrame = $state(0);
  let startAnimId: number | null = null;

  function tickStartScreen() {
    if (tournament.phase !== 'idle' || view !== 'tournament') {
      startAnimId = null;
      return;
    }
    startFrame++;
    if (tournCtx) drawStartScreen(tournCtx, TOURN_W, TOURN_H, startFrame);
    startAnimId = requestAnimationFrame(tickStartScreen);
  }

  function stopStartAnim() {
    if (startAnimId != null) {
      cancelAnimationFrame(startAnimId);
      startAnimId = null;
    }
  }

  // --- Lifecycle ---
  onMount(() => {
    tournCtx = tournCanvas.getContext('2d')!;
    tickStartScreen();
    return () => stopStartAnim();
  });

  function switchToChallenge() {
    view = 'challenge';
    requestAnimationFrame(() => {
      chalCtx = chalCanvas.getContext('2d')!;
      initChallenge();
    });
  }

  function switchToTournament() {
    view = 'tournament';
    requestAnimationFrame(() => {
      if (tournament.phase === 'idle') tickStartScreen();
      else drawTourn();
    });
  }

  async function startTournament() {
    stopStartAnim();
    await runTournament();
  }
</script>

<SEO
  title="Drop Four — Lab"
  description="6 AI personalities play a Connect 4 round-robin tournament, then you challenge the winner."
  path="/experiments/drop-four"
/>

<div class="max-w-3xl mx-auto px-5 py-8 space-y-6">
  <header class="space-y-2">
    <h1 class="text-2xl font-semibold text-(--text)">Drop Four</h1>
    <p class="text-sm text-(--text-3) max-w-2xl leading-relaxed">
      Six AI personalities compete in a round-robin Connect 4 tournament — 15 games running in parallel across isolated workers.
      Each move is a structured JSON response from the LLM reading the real board state. When the dust settles, you challenge the champion.
    </p>
  </header>

  {#if view === 'tournament'}
    <div class="flex items-center gap-3 flex-wrap">
      {#if tournament.phase === 'idle'}
        <button
          onclick={startTournament}
          class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Run Tournament
        </button>
      {:else if tournament.phase === 'running'}
        <span class="text-sm text-(--text-2)">
          Running... {tournament.gamesComplete} / {tournament.matches.length} games complete
        </span>
      {:else if tournament.phase === 'done'}
        <button
          onclick={switchToChallenge}
          class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Challenge the Champion
        </button>
        <button
          onclick={() => { resetTournament(); }}
          class="px-3 py-2 rounded-lg bg-(--code-bg) text-(--text) text-sm border border-(--border) cursor-pointer"
        >
          New Tournament
        </button>
        {#if tournament.champion}
          <span class="text-sm text-(--text-2)">
            Champion: {PLAY_STYLES[tournament.champion]?.label ?? tournament.champion}
          </span>
        {/if}
      {/if}
    </div>

    <div class="w-full">
      <canvas
        bind:this={tournCanvas}
        width={TOURN_W}
        height={TOURN_H}
        class="rounded-xl border border-(--border) w-full"
        style="aspect-ratio: {TOURN_W}/{TOURN_H}; display: block;"
      ></canvas>
    </div>

    {#if tournament.standings.length > 0}
      <div class="space-y-2">
        <h2 class="text-sm font-medium text-(--text-2)">Standings</h2>
        <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-(--border) text-(--text-3)">
                <th class="text-left px-3 py-2 font-medium">#</th>
                <th class="text-left px-3 py-2 font-medium">Player</th>
                <th class="text-center px-3 py-2 font-medium">W</th>
                <th class="text-center px-3 py-2 font-medium">D</th>
                <th class="text-center px-3 py-2 font-medium">L</th>
                <th class="text-center px-3 py-2 font-medium">Pts</th>
              </tr>
            </thead>
            <tbody>
              {#each tournament.standings as s, i}
                <tr class="border-b border-(--border) last:border-0 {i === 0 && tournament.phase === 'done' ? 'text-(--accent) font-semibold' : 'text-(--text-2)'}">
                  <td class="px-3 py-2">{i + 1}</td>
                  <td class="px-3 py-2">{s.label}</td>
                  <td class="text-center px-3 py-2">{s.wins}</td>
                  <td class="text-center px-3 py-2">{s.draws}</td>
                  <td class="text-center px-3 py-2">{s.losses}</td>
                  <td class="text-center px-3 py-2">{s.points}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    {#if tournament.traces.length > 0}
      <div class="space-y-2">
        <h2 class="text-sm font-medium text-(--text-2)">
          Trace Log ({tournament.traces.length} moves)
        </h2>
        <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden max-h-64 overflow-y-auto">
          <table class="w-full text-xs">
            <thead class="sticky top-0 bg-(--code-bg)">
              <tr class="border-b border-(--border) text-(--text-3)">
                <th class="text-left px-2 py-1.5 font-medium">Game</th>
                <th class="text-left px-2 py-1.5 font-medium">Turn</th>
                <th class="text-left px-2 py-1.5 font-medium">Player</th>
                <th class="text-left px-2 py-1.5 font-medium">Col</th>
                <th class="text-left px-2 py-1.5 font-medium">Reason</th>
                <th class="text-left px-2 py-1.5 font-medium">Trace</th>
              </tr>
            </thead>
            <tbody>
              {#each tournament.traces.slice(-50) as t}
                <tr class="border-b border-(--border) last:border-0 text-(--text-2)">
                  <td class="px-2 py-1">{t.matchIndex + 1}</td>
                  <td class="px-2 py-1">{t.turn}</td>
                  <td class="px-2 py-1">{PLAY_STYLES[t.style]?.label ?? t.style} ({t.player})</td>
                  <td class="px-2 py-1">{t.col}</td>
                  <td class="px-2 py-1 max-w-48 truncate">{t.reason || '—'}</td>
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
        {#if tournament.traces.length > 0}
          {@const last = tournament.traces[tournament.traces.length - 1]}
          {#if last.generated}
            <div class="space-y-1">
              <h3 class="text-xs font-medium text-(--text-3)">Last Response</h3>
              <div class="rounded-lg bg-(--code-bg) border border-(--border) overflow-hidden">
                <pre class="p-2 text-xs text-(--text-2) overflow-x-auto"><code>{last.generated}</code></pre>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

  {:else}
    <div class="flex items-center gap-3 flex-wrap">
      <button
        onclick={switchToTournament}
        class="px-3 py-2 rounded-lg bg-(--code-bg) text-(--text) text-sm border border-(--border) cursor-pointer"
      >
        Back to Tournament
      </button>
      <button
        onclick={initChallenge}
        class="px-4 py-2 rounded-lg bg-(--accent) text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
      >
        New Game
      </button>
      {#if tournament.champion}
        <span class="text-sm text-(--text-3)">
          vs {PLAY_STYLES[tournament.champion]?.label ?? tournament.champion} (Champion)
        </span>
      {/if}
      <span class="text-sm text-(--text-2)">{chalStatus}</span>
    </div>

    <div class="w-full max-w-2xl">
      <canvas
        bind:this={chalCanvas}
        width={CHAL_W}
        height={CHAL_H}
        onclick={handleChalClick}
        onmousemove={handleChalHover}
        onmouseleave={handleChalLeave}
        class="rounded-xl border border-(--border) cursor-pointer w-full"
        style="aspect-ratio: {CHAL_W}/{CHAL_H}; display: block;"
      ></canvas>
    </div>

    {#if chalReason}
      <div class="rounded-lg bg-(--code-bg) border border-(--border) px-4 py-3 max-w-2xl">
        <p class="text-sm text-(--text-2) italic">"{chalReason}"</p>
      </div>
    {/if}

    {#if lastTraceId}
      <a href="/t/{lastTraceId}" class="text-xs text-(--accent) underline hover:opacity-80">
        View trace /t/{lastTraceId}
      </a>
    {/if}
  {/if}
</div>

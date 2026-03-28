// Tournament state machine — Svelte 5 runes module

import {
  createBoard,
  cloneBoard,
  dropPiece,
  checkWin,
  isDraw,
  getValidColumns,
  findThreats,
  boardToAscii,
  generateMatchups,
  PLAY_STYLES,
  type Board,
  type Player,
} from './game';
import { runGenerate } from '../../data.remote';

const AI_MODEL = '@cf/zai-org/glm-4.7-flash';

export type TraceEntry = {
  matchIndex: number;
  turn: number;
  player: Player;
  style: string;
  col: number;
  reason: string;
  traceId: string | null;
  generated: string;
};

export type MatchState = {
  p1: string;
  p2: string;
  board: Board;
  status: 'pending' | 'playing' | 'done' | 'error';
  winner: string | null;
  winCells: [number, number][] | null;
  moves: number;
  error?: string;
};

export type Standing = {
  style: string;
  label: string;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

const styleKeys = Object.keys(PLAY_STYLES);

// Wrap all state in a single object so Svelte 5 allows export + reassignment
export const tournament = $state({
  matches: [] as MatchState[],
  standings: [] as Standing[],
  champion: null as string | null,
  phase: 'idle' as 'idle' | 'running' | 'done',
  gamesComplete: 0,
  traces: [] as TraceEntry[],
});

function buildPrompt(board: Board, player: Player, styleKey: string): string {
  const style = PLAY_STYLES[styleKey];
  const valid = getValidColumns(board);
  const myThreats = findThreats(board, player);
  const oppThreats = findThreats(board, player === 'R' ? 'Y' : 'R');

  let hint = '';
  if (myThreats.length) hint = `\nYou can WIN by dropping in column ${myThreats[0]}. Play there.`;
  else if (oppThreats.length) hint = `\nOpponent wins at column ${oppThreats.join(' or ')}. BLOCK.`;

  return `Connect 4. You are ${player}. ${style.prompt}

${boardToAscii(board)}

Valid columns: ${valid.join(' ')}${hint}
Return JSON: {"col": <0-6>, "r": "<why>"}`;
}

async function playGame(index: number): Promise<void> {
  const m = tournament.matches[index];
  m.status = 'playing';
  const board = createBoard();
  m.board = board;

  let currentStyle = m.p1;
  let currentPlayer: Player = 'R';
  let moveCount = 0;

  for (let turn = 0; turn < 42; turn++) {
    const prompt = buildPrompt(board, currentPlayer, currentStyle);

    try {
      const result = await runGenerate({
        prompt,
        mode: 'json',
        capabilities: [],
        model: AI_MODEL,
        input: { board },
      });

      const parsed = (result.ok ? result.result : null) as { col: number; r?: string } | null;
      let col = parsed?.col;

      const valid = getValidColumns(board);
      if (typeof col !== 'number' || !valid.includes(col)) {
        col = valid[Math.floor(Math.random() * valid.length)];
      }

      if (col == null) break;

      tournament.traces.push({
        matchIndex: index,
        turn: moveCount,
        player: currentPlayer,
        style: currentStyle,
        col,
        reason: parsed?.r ?? '',
        traceId: result.traceId ?? null,
        generated: result.generated ?? '',
      });

      dropPiece(board, col, currentPlayer);
      moveCount++;
      m.board = cloneBoard(board);
      m.moves = moveCount;

      const win = checkWin(board);
      if (win) {
        m.winner = currentStyle;
        m.winCells = win.cells;
        m.status = 'done';
        tournament.gamesComplete++;
        return;
      }

      if (isDraw(board)) {
        m.winner = 'draw';
        m.status = 'done';
        tournament.gamesComplete++;
        return;
      }

      currentStyle = currentStyle === m.p1 ? m.p2 : m.p1;
      currentPlayer = currentPlayer === 'R' ? 'Y' : 'R';

      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      m.error = e instanceof Error ? e.message : String(e);
      m.status = 'error';
      tournament.gamesComplete++;
      return;
    }
  }

  m.winner = 'draw';
  m.status = 'done';
  tournament.gamesComplete++;
}

function computeStandings() {
  const pts: Record<string, { wins: number; draws: number; losses: number }> = {};
  for (const key of styleKeys) {
    pts[key] = { wins: 0, draws: 0, losses: 0 };
  }

  for (const m of tournament.matches) {
    if (m.status !== 'done') continue;
    if (m.winner === 'draw') {
      pts[m.p1].draws++;
      pts[m.p2].draws++;
    } else if (m.winner) {
      pts[m.winner].wins++;
      const loser = m.winner === m.p1 ? m.p2 : m.p1;
      pts[loser].losses++;
    }
  }

  tournament.standings = styleKeys
    .map(key => ({
      style: key,
      label: PLAY_STYLES[key].label,
      wins: pts[key].wins,
      draws: pts[key].draws,
      losses: pts[key].losses,
      points: pts[key].wins * 3 + pts[key].draws,
    }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins);

  if (tournament.phase === 'done' && tournament.standings.length > 0) {
    tournament.champion = tournament.standings[0].style;
  }
}

export async function runTournament() {
  const pairs = generateMatchups(styleKeys);
  tournament.matches = pairs.map(([p1, p2]) => ({
    p1,
    p2,
    board: createBoard(),
    status: 'pending' as const,
    winner: null,
    winCells: null,
    moves: 0,
  }));
  tournament.standings = [];
  tournament.champion = null;
  tournament.gamesComplete = 0;
  tournament.traces = [];
  tournament.phase = 'running';

  const promises = tournament.matches.map((_, i) =>
    playGame(i).then(() => computeStandings())
  );

  await Promise.allSettled(promises);
  tournament.phase = 'done';
  computeStandings();
}

export function resetTournament() {
  tournament.matches = [];
  tournament.standings = [];
  tournament.champion = null;
  tournament.gamesComplete = 0;
  tournament.traces = [];
  tournament.phase = 'idle';
}

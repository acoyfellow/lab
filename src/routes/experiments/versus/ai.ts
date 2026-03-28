// AI move logic — minimax search handles strategy, LLM picks preference on ties

import { runGenerate } from '../../data.remote';
import {
  boardToAscii,
  cloneBoard,
  dropPiece,
  getValidColumns,
  checkWin,
  isDraw,
  type Board,
  type Player,
  COLS,
  ROWS,
} from '../drop-four/game';

const AI_MODEL = '@cf/zai-org/glm-4.7-flash';
const SEARCH_DEPTH = 8;

export type AiResult = {
  col: number;
  reason: string;
  traceId: string | null;
  generated: string;
};

/** Static position evaluation — score the board without searching deeper. */
function evaluate(board: Board, player: Player, _opp: Player): number {
  const win = checkWin(board);
  if (win) return win.winner === player ? 100000 : -100000;

  let score = 0;
  const dirs: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];

  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < board[c].length; r++) {
      const piece = board[c][r];
      if (!piece) continue;
      const sign = piece === player ? 1 : -1;

      for (const [dc, dr] of dirs) {
        let count = 1;
        let open = 0;
        // Forward
        for (let s = 1; s < 4; s++) {
          const nc = c + dc * s, nr = r + dr * s;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
          const cell = board[nc]?.[nr] ?? null;
          if (cell === piece) count++;
          else { if (cell === null) open++; break; }
        }
        // Backward
        for (let s = 1; s < 4; s++) {
          const nc = c - dc * s, nr = r - dr * s;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) break;
          const cell = board[nc]?.[nr] ?? null;
          if (cell === piece) count++;
          else { if (cell === null) open++; break; }
        }

        if (count >= 3 && open >= 1) score += sign * 50;
        else if (count >= 2 && open >= 2) score += sign * 10;
      }

      // Center column preference
      score += sign * (3 - Math.abs(c - 3)) * 2;
    }
  }

  return score;
}

/** Minimax with alpha-beta pruning. */
function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: Player,
  opp: Player,
): number {
  const win = checkWin(board);
  if (win) return win.winner === player ? 100000 + depth : -100000 - depth;
  if (isDraw(board)) return 0;
  if (depth === 0) return evaluate(board, player, opp);

  const valid = getValidColumns(board);
  // Search center columns first for better pruning
  valid.sort((a, b) => Math.abs(a - 3) - Math.abs(b - 3));

  if (maximizing) {
    let best = -Infinity;
    for (const col of valid) {
      const sim = cloneBoard(board);
      dropPiece(sim, col, player);
      const val = minimax(sim, depth - 1, alpha, beta, false, player, opp);
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const col of valid) {
      const sim = cloneBoard(board);
      dropPiece(sim, col, opp);
      const val = minimax(sim, depth - 1, alpha, beta, true, player, opp);
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

/** Search all valid columns and return scored results. */
function search(board: Board, player: Player): { col: number; score: number }[] {
  const opp: Player = player === 'R' ? 'Y' : 'R';
  const valid = getValidColumns(board);

  return valid.map(col => {
    const sim = cloneBoard(board);
    dropPiece(sim, col, player);
    const score = minimax(sim, SEARCH_DEPTH - 1, -Infinity, Infinity, false, player, opp);
    return { col, score };
  }).sort((a, b) => b.score - a.score);
}

export async function aiMove(board: Board, player: Player, insights: string[] = []): Promise<AiResult> {
  const results = search(board, player);
  const best = results[0];
  const topScore = best.score;

  // Ties — columns with same score as best
  const ties = results.filter(r => r.score === topScore);

  // If multiple columns are equally good, let the LLM pick among them
  let col = best.col;
  let llmReason = '';
  let traceId: string | null = null;
  let generated = '';

  const valid = getValidColumns(board);
  const insightBlock = insights.length ? `\nPast games:\n${insights.join('\n')}\n` : '';
  const prompt = `${boardToAscii(board)}
You:${player} Valid:${valid.join(',')}${insightBlock}
{"col":<0-6>,"r":"<why>"}`;

  const result = await runGenerate({
    prompt,
    mode: 'json',
    capabilities: [],
    model: AI_MODEL,
    input: { board },
  });

  traceId = result.traceId ?? null;
  generated = result.generated ?? '';

  const parsed = (result.ok ? result.result : null) as { col: number; r?: string } | null;
  llmReason = parsed?.r ?? '';

  // LLM can only override if its pick is among the tied-best columns
  if (ties.length > 1 && typeof parsed?.col === 'number') {
    const llmInTies = ties.find(t => t.col === parsed.col);
    if (llmInTies) col = parsed.col;
  }

  const reason = topScore >= 100000
    ? `Forced win (depth ${SEARCH_DEPTH})`
    : topScore <= -100000
      ? `Losing — playing best delay`
      : `Search score ${topScore}${ties.length > 1 ? ` (${ties.length} tied)` : ''}${llmReason ? ` — LLM: ${llmReason}` : ''}`;

  return { col, reason, traceId, generated };
}

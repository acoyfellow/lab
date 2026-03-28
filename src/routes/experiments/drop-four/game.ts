// Pure Connect 4 engine — no UI, no LLM

export const COLS = 7;
export const ROWS = 6;
export type Player = 'R' | 'Y';
export type Cell = Player | null;

/** Board is 7 columns, each a stack from bottom (index 0) up. */
export type Board = Cell[][];

export type WinResult = { winner: Player; cells: [number, number][] } | null;

export const PLAY_STYLES: Record<string, { label: string; prompt: string }> = {
  strategic: { label: 'Strategic', prompt: 'Play optimally. Win if you can, block if you must. Prefer center columns.' },
  aggressive: { label: 'Aggressive', prompt: 'Play to WIN. Prioritize offense over defense. Build multiple threats. Ignore blocks unless forced.' },
  defensive: { label: 'Defensive', prompt: 'Play ultra-safe. Always block threats first. Never take risks. Prefer center columns.' },
  chaotic: { label: 'Chaotic', prompt: 'Play unpredictably. Pick surprising columns. Avoid the obvious choice.' },
  drunk: { label: 'Drunk', prompt: 'You are very drunk. You TRY to play well but sometimes pick a random column instead. About 40% chance of a bad move.' },
  troll: { label: 'Troll', prompt: 'You are trolling. Make the WORST possible move on purpose. Help the opponent win.' },
};

export function createBoard(): Board {
  return Array.from({ length: COLS }, () => []);
}

export function cloneBoard(board: Board): Board {
  return board.map(col => [...col]);
}

export function dropPiece(board: Board, col: number, player: Player): boolean {
  if (col < 0 || col >= COLS || board[col].length >= ROWS) return false;
  board[col].push(player);
  return true;
}

export function getValidColumns(board: Board): number[] {
  return Array.from({ length: COLS }, (_, i) => i).filter(c => board[c].length < ROWS);
}

export function getCell(board: Board, col: number, row: number): Cell {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  return board[col][row] ?? null;
}

const DIRECTIONS: [number, number][] = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function checkWin(board: Board): WinResult {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < board[col].length; row++) {
      const p = board[col][row];
      if (!p) continue;
      for (const [dc, dr] of DIRECTIONS) {
        const cells: [number, number][] = [[col, row]];
        for (let step = 1; step < 4; step++) {
          const c = col + dc * step;
          const r = row + dr * step;
          if (getCell(board, c, r) !== p) break;
          cells.push([c, r]);
        }
        if (cells.length === 4) return { winner: p, cells };
      }
    }
  }
  return null;
}

export function isDraw(board: Board): boolean {
  return board.every(col => col.length >= ROWS);
}

/** Find columns where dropping a piece would win immediately. */
export function findThreats(board: Board, player: Player): number[] {
  const threats: number[] = [];
  for (const col of getValidColumns(board)) {
    const test = cloneBoard(board);
    dropPiece(test, col, player);
    if (checkWin(test)?.winner === player) threats.push(col);
  }
  return threats;
}

/** ASCII board for LLM prompts. */
export function boardToAscii(board: Board): string {
  const lines: string[] = [];
  lines.push('  0 1 2 3 4 5 6');
  for (let row = ROWS - 1; row >= 0; row--) {
    const cells = Array.from({ length: COLS }, (_, col) => {
      const v = getCell(board, col, row);
      return v === 'R' ? 'R' : v === 'Y' ? 'Y' : '.';
    });
    lines.push(`${row} ${cells.join(' ')}`);
  }
  return lines.join('\n');
}

/** Generate all round-robin matchups from style keys. */
export function generateMatchups(styles: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < styles.length; i++) {
    for (let j = i + 1; j < styles.length; j++) {
      pairs.push([styles[i], styles[j]]);
    }
  }
  return pairs;
}

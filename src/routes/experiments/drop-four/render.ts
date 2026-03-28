// Canvas rendering for Drop Four — mini tournament boards + full game board

import { COLS, ROWS, getCell, type Board, type Player } from './game';

const BOARD_COLOR = '#1565c0';
const RED = '#e53935';
const YELLOW = '#fdd835';
const EMPTY_SLOT = '#111';
const WIN_GLOW = 'rgba(255, 255, 255, 0.35)';

function pieceColor(p: Player | null): string {
  if (p === 'R') return RED;
  if (p === 'Y') return YELLOW;
  return EMPTY_SLOT;
}

/** Draw a single Connect 4 board into a rectangular region. */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  x: number,
  y: number,
  w: number,
  h: number,
  winCells?: [number, number][] | null,
) {
  const cellW = w / COLS;
  const cellH = h / ROWS;
  const radius = Math.min(cellW, cellH) * 0.38;

  // Board background
  ctx.fillStyle = BOARD_COLOR;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // Pieces
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const cx = x + col * cellW + cellW / 2;
      const cy = y + (ROWS - 1 - row) * cellH + cellH / 2;
      ctx.fillStyle = pieceColor(getCell(board, col, row));
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Win highlight
  if (winCells) {
    for (const [col, row] of winCells) {
      const cx = x + col * cellW + cellW / 2;
      const cy = y + (ROWS - 1 - row) * cellH + cellH / 2;
      ctx.fillStyle = WIN_GLOW;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export type MatchView = {
  p1Label: string;
  p2Label: string;
  board: Board;
  status: 'pending' | 'playing' | 'done' | 'error';
  winCells?: [number, number][] | null;
  winnerLabel?: string | null;
};

/** Draw retro pixel start screen. */
export function drawStartScreen(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  frame: number,
) {
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Scanlines effect
  ctx.fillStyle = 'rgba(255,255,255,0.015)';
  for (let y = 0; y < canvasH; y += 4) {
    ctx.fillRect(0, y, canvasW, 1);
  }

  // Pixel grid: draw a decorative mini board in the center
  const boardW = 280;
  const boardH = 240;
  const bx = (canvasW - boardW) / 2;
  const by = canvasH * 0.28;
  const cellW = boardW / 7;
  const cellH = boardH / 6;
  const radius = Math.min(cellW, cellH) * 0.35;

  // Board
  ctx.fillStyle = BOARD_COLOR;
  ctx.beginPath();
  ctx.roundRect(bx, by, boardW, boardH, 8);
  ctx.fill();

  // Decorative pieces — animated drop pattern
  const pattern = [
    [3], // col 3
    [3, 4], // cols 3,4
    [2, 3, 4],
    [2, 3, 4, 3],
    [1, 2, 3, 4, 3],
    [1, 2, 3, 4, 3, 5],
  ];

  const step = Math.floor(frame / 12) % pattern.length;
  const pieces = pattern[step];
  for (let i = 0; i < pieces.length; i++) {
    const col = pieces[i];
    const row = i;
    if (row >= 6) continue;
    const cx = bx + col * cellW + cellW / 2;
    const cy = by + (5 - row) * cellH + cellH / 2;
    ctx.fillStyle = i % 2 === 0 ? RED : YELLOW;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Empty slots (draw on top where no piece)
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row < 6; row++) {
      const hasPiece = pieces && row < pieces.length && pieces[row] === col;
      if (hasPiece) continue;
      // Check if this slot already drawn
      let drawn = false;
      for (let i = 0; i < (pieces?.length ?? 0); i++) {
        if (pieces[i] === col && i === row) { drawn = true; break; }
      }
      if (!drawn) {
        const cx = bx + col * cellW + cellW / 2;
        const cy = by + (5 - row) * cellH + cellH / 2;
        ctx.fillStyle = EMPTY_SLOT;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Title — pixel font style
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DROP FOUR', canvasW / 2, by - 40);

  // Subtitle
  ctx.fillStyle = '#888';
  ctx.font = '14px monospace';
  ctx.fillText('6 AI PERSONALITIES  //  15 PARALLEL GAMES', canvasW / 2, by - 12);

  // Blinking "PRESS START" text
  const blink = Math.floor(frame / 30) % 2 === 0;
  if (blink) {
    ctx.fillStyle = YELLOW;
    ctx.font = 'bold 20px monospace';
    ctx.fillText('[ RUN TOURNAMENT ]', canvasW / 2, canvasH - 50);
  }

  // Version
  ctx.fillStyle = '#333';
  ctx.font = '10px monospace';
  ctx.fillText('GLM-4.7-FLASH  //  WORKERS AI', canvasW / 2, canvasH - 20);
}

/** Draw the 15-game tournament grid. */
export function drawTournamentGrid(
  ctx: CanvasRenderingContext2D,
  matches: MatchView[],
  canvasW: number,
  canvasH: number,
) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const gridCols = 5;
  const gridRows = 3;
  const pad = 12;
  const labelH = 22;
  const cellW = (canvasW - pad * (gridCols + 1)) / gridCols;
  const cellH = (canvasH - pad * (gridRows + 1) - labelH * gridRows) / gridRows;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const gc = i % gridCols;
    const gr = Math.floor(i / gridCols);
    const x = pad + gc * (cellW + pad);
    const y = pad + gr * (cellH + pad + labelH);

    // Draw mini board
    if (m.status === 'pending') {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(x, y, cellW, cellH, 6);
      ctx.fill();
      ctx.fillStyle = '#444';
      ctx.font = `${Math.max(10, cellW * 0.1)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('waiting...', x + cellW / 2, y + cellH / 2 + 4);
    } else {
      drawBoard(ctx, m.board, x, y, cellW, cellH, m.winCells);
    }

    // Label — use short names to avoid overlap
    const labelY = y + cellH + 12;
    const short = (label: string) => label.slice(0, 3).toUpperCase();
    const fontSize = Math.max(8, Math.min(11, cellW * 0.06));
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';

    const p1Short = short(m.p1Label);
    const p2Short = short(m.p2Label);

    if (m.status === 'done' && m.winnerLabel) {
      ctx.fillStyle = '#666';
      ctx.fillText(`${p1Short} vs ${p2Short}`, x + cellW / 2, labelY);
      ctx.fillStyle = m.winnerLabel === m.p1Label ? RED : YELLOW;
      ctx.fillText('●', x + (m.winnerLabel === m.p1Label ? 6 : cellW - 6), labelY);
    } else if (m.status === 'done') {
      ctx.fillStyle = '#888';
      ctx.fillText(`${p1Short} vs ${p2Short} draw`, x + cellW / 2, labelY);
    } else {
      ctx.fillStyle = m.status === 'playing' ? '#aaa' : '#555';
      ctx.fillText(`${p1Short} vs ${p2Short}`, x + cellW / 2, labelY);
    }
  }
}

/** Draw the full-size challenge board. */
export function drawChallengeBoard(
  ctx: CanvasRenderingContext2D,
  board: Board,
  canvasW: number,
  canvasH: number,
  winCells?: [number, number][] | null,
  hoverCol?: number | null,
  hoverPlayer?: Player,
) {
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const pad = 20;
  const topGutter = 50; // space for hover indicator
  const boardW = canvasW - pad * 2;
  const boardH = canvasH - pad - topGutter;

  drawBoard(ctx, board, pad, topGutter, boardW, boardH, winCells);

  // Hover indicator
  if (hoverCol != null && hoverPlayer) {
    const cellW = boardW / COLS;
    const cx = pad + hoverCol * cellW + cellW / 2;
    const radius = Math.min(cellW, boardH / ROWS) * 0.38;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = hoverPlayer === 'R' ? RED : YELLOW;
    ctx.beginPath();
    ctx.arc(cx, topGutter / 2 + 5, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Column numbers
  const cellW = boardW / COLS;
  ctx.fillStyle = '#555';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  for (let c = 0; c < COLS; c++) {
    ctx.fillText(String(c), pad + c * cellW + cellW / 2, canvasH - 4);
  }
}

/** Get which column was clicked given canvas coordinates. */
export function hitTestColumn(
  canvasW: number,
  canvasH: number,
  clickX: number,
  _clickY: number,
): number | null {
  const pad = 20;
  const boardW = canvasW - pad * 2;
  const col = Math.floor((clickX - pad) / (boardW / COLS));
  if (col < 0 || col >= COLS) return null;
  return col;
}

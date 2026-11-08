/**
 * Strict FEN validation. chess.js 1.0.0 accepts some impossible positions — kings on
 * adjacent squares, the side NOT to move standing in check, a missing field — and
 * Stockfish can crash on such input. Every position that enters the academy from outside
 * (analysis-board imports, content, engine input) goes through this check.
 */
import { Chess } from 'chess.js';

/** Returns null when the FEN is a legal, reachable-looking position, otherwise a reason. */
export function fenProblem(fen: string): string | null {
  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) return 'A FEN needs exactly six fields (pieces, side to move, castling, en passant, half-move clock, move number).';
  let c: Chess;
  try { c = new Chess(fen); } catch (e) { return (e as Error).message.replace(/^Invalid FEN: /, ''); }
  const kings: { color: 'w' | 'b'; file: number; rank: number }[] = [];
  c.board().forEach((row, r) => row.forEach((p, f) => { if (p?.type === 'k') kings.push({ color: p.color, file: f, rank: r }); }));
  const [a, b] = kings;
  if (a && b && Math.abs(a.file - b.file) <= 1 && Math.abs(a.rank - b.rank) <= 1) return 'The kings cannot stand on neighbouring squares.';
  const flipped = fields.slice();
  flipped[1] = fields[1] === 'w' ? 'b' : 'w';
  flipped[3] = '-';
  try {
    if (new Chess(flipped.join(' ')).isCheck()) return `The side not to move (${fields[1] === 'w' ? 'Black' : 'White'}) is in check, which cannot happen.`;
  } catch { /* the flipped position may be invalid for other reasons; the original was accepted */ }
  return null;
}

export const isLegalFen = (fen: string) => fenProblem(fen) === null;

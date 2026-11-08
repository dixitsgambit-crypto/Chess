/**
 * Plain, verifiable facts about a position for the AI Grandmaster panel.
 * Everything here is computed from the rules (chess.js), never guessed: material,
 * checks, undefended pieces, pieces attacked by cheaper pieces and king safety.
 */
import { Chess, type Square } from 'chess.js';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const SIDE = { w: 'White', b: 'Black' } as const;

export interface Observation { tone: 'info' | 'warn' | 'good'; text: string }

export function observe(fen: string): Observation[] {
  const c = new Chess(fen);
  const out: Observation[] = [];
  const stm = c.turn();
  let mat = 0;
  const pieces: { sq: Square; type: string; color: 'w' | 'b' }[] = [];
  for (const row of c.board()) for (const p of row) if (p) { pieces.push({ sq: p.square, type: p.type, color: p.color }); mat += (p.color === 'w' ? 1 : -1) * VALUE[p.type]; }

  if (c.isCheckmate()) return [{ tone: 'warn', text: `Checkmate — ${SIDE[stm === 'w' ? 'b' : 'w']} has won.` }];
  if (c.isStalemate()) return [{ tone: 'info', text: 'Stalemate — the game is drawn.' }];
  if (c.isInsufficientMaterial()) return [{ tone: 'info', text: 'Neither side has enough material to checkmate: a draw.' }];

  out.push({ tone: 'info', text: mat === 0 ? 'Material is level.' : `${mat > 0 ? 'White' : 'Black'} is ahead by ${Math.abs(mat)} point${Math.abs(mat) > 1 ? 's' : ''} of material.` });
  if (c.isCheck()) out.push({ tone: 'warn', text: `${SIDE[stm]} is in check and has ${c.moves().length} legal move${c.moves().length === 1 ? '' : 's'}.` });

  for (const p of pieces) {
    if (p.type === 'k') continue;
    const opp = p.color === 'w' ? 'b' : 'w';
    const attackers = c.attackers(p.sq, opp);
    if (!attackers.length) continue;
    const defenders = c.attackers(p.sq, p.color);
    const cheapest = Math.min(...attackers.map((s) => VALUE[c.get(s)!.type] || 100));
    const who = `${SIDE[p.color]}’s ${NAME[p.type]} on ${p.sq}`;
    if (!defenders.length) out.push({ tone: p.color === stm ? 'warn' : 'good', text: `${who} is attacked and undefended.` });
    else if (cheapest < VALUE[p.type]) out.push({ tone: p.color === stm ? 'warn' : 'good', text: `${who} is attacked by a cheaper piece (${NAME[c.get(attackers.find((s) => VALUE[c.get(s)!.type] === cheapest)!)!.type]}).` });
  }

  const moves = c.moves({ verbose: true });
  const checks = moves.filter((m) => m.san.includes('+') || m.san.includes('#'));
  const mates = moves.filter((m) => m.san.includes('#'));
  if (mates.length) out.push({ tone: 'good', text: `${SIDE[stm]} has checkmate in one: ${mates.map((m) => m.san).join(', ')}.` });
  else if (checks.length) out.push({ tone: 'info', text: `Checks available to ${SIDE[stm]}: ${checks.slice(0, 5).map((m) => m.san).join(', ')}${checks.length > 5 ? '…' : ''}.` });
  const caps = moves.filter((m) => m.captured);
  if (caps.length) out.push({ tone: 'info', text: `Captures available: ${caps.slice(0, 6).map((m) => m.san).join(', ')}${caps.length > 6 ? '…' : ''}.` });

  const moveNo = Number(fen.split(' ')[5] ?? 1);
  for (const color of ['w', 'b'] as const) {
    const king = pieces.find((p) => p.type === 'k' && p.color === color)!;
    const rights = c.getCastlingRights(color);
    const homeRank = color === 'w' ? '1' : '8';
    const central = ['d', 'e'].includes(king.sq[0]) && king.sq[1] === homeRank;
    if (moveNo >= 10 && central && !rights.k && !rights.q && pieces.filter((p) => p.type === 'q').length) out.push({ tone: color === stm ? 'warn' : 'info', text: `${SIDE[color]}’s king is still in the centre and can no longer castle.` });
  }
  return out;
}

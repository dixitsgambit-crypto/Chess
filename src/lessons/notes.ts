import { Chess } from 'chess.js';
import { positionKey } from '../pgn/parser.ts';
import { labNotes, setLabNotes } from '../academy/lab';

/**
 * Teaching notes supplied by the user (typed in the app or pasted from elsewhere, e.g. ChatGPT).
 * Keyed by position so a note follows the position through transpositions.
 */
export interface UserNote {
  key: string;
  moves: string; // the move sequence the note was written for, for display
  text: string;
  updated: number;
}

// Notes are stored on the server with the rest of the player's Opening Laboratory data.
export function loadNotes(): Record<string, UserNote> {
  return { ...labNotes() };
}

export function saveNotes(notes: Record<string, UserNote>) {
  setLabNotes(notes);
}

/** Replay "1.e4 e6 2.d4 d5" style text from the start position. Returns the FEN or an error. */
export function replayMoves(moves: string): { fen: string } | { error: string } {
  const chess = new Chess();
  const tokens = moves
    .replace(/\d+\.(\.\.)?/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  for (const t of tokens) {
    try {
      chess.move(t);
    } catch {
      return { error: `"${t}" is not legal after ${chess.history().join(' ') || 'the start'}` };
    }
  }
  return { fen: chess.fen() };
}

/**
 * Import format (one block per position):
 *
 *   @ 1.e4 e6 2.d4 d5 3.e5 Bd7
 *   We trade our bad light-squared bishop via b5 ...
 *
 * Everything until the next "@" line is the note.
 */
export function parseNotesImport(text: string): { notes: UserNote[]; errors: string[] } {
  const notes: UserNote[] = [];
  const errors: string[] = [];
  const blocks = text.replace(/\r/g, '').split(/^@/m).slice(1);
  for (const block of blocks) {
    const [head, ...rest] = block.split('\n');
    const body = rest.join('\n').trim();
    const res = replayMoves(head.trim());
    if ('error' in res) errors.push(`@ ${head.trim()}: ${res.error}`);
    else if (!body) errors.push(`@ ${head.trim()}: empty note`);
    else notes.push({ key: positionKey(res.fen), moves: head.trim(), text: body, updated: Date.now() });
  }
  if (!blocks.length && text.trim()) errors.push('No "@ moves" headers found');
  return { notes, errors };
}

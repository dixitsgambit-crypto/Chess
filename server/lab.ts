/**
 * Validation for Opening Laboratory data stored on the server: the player's uploaded PGN
 * files, position notes, line-practice statistics and side preference. The built-in
 * blackmood.pgn is not stored per user; it is served from public/repertoire.
 */
import { parsePgn } from '../src/pgn/parser.ts';

export interface LabData {
  sources: { name: string; text: string }[];
  notes: Record<string, { key: string; moves: string; text: string; updated: number }>;
  stats: Record<string, { attempts: number; clean: number; last: number }>;
  side: 'auto' | 'w' | 'b';
}

export const LAB_LIMITS = { files: 20, fileBytes: 512 * 1024, totalBytes: 2 * 1024 * 1024, notes: 3000, noteChars: 8000, stats: 10000 };

export function validateLab(input: unknown): LabData | string {
  if (!input || typeof input !== 'object') return 'Invalid laboratory data.';
  const d = input as Record<string, unknown>;
  const sources = Array.isArray(d.sources) ? d.sources : [];
  if (sources.length > LAB_LIMITS.files) return `At most ${LAB_LIMITS.files} PGN files.`;
  let total = 0;
  const outSources: LabData['sources'] = [];
  const names = new Set<string>();
  for (const s of sources) {
    if (!s || typeof s !== 'object') return 'Invalid PGN file entry.';
    const { name, text } = s as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim() || name.length > 120) return 'PGN file names must be 1–120 characters.';
    if (typeof text !== 'string') return `“${name}” has no text.`;
    if (names.has(name)) return `Two files are called “${name}”.`;
    names.add(name);
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > LAB_LIMITS.fileBytes) return `“${name}” is larger than ${LAB_LIMITS.fileBytes / 1024} KB.`;
    total += bytes;
    let games;
    try { games = parsePgn(text); } catch { return `“${name}” could not be read as PGN.`; }
    if (!games.length || !games.some((g) => g.root.children.length)) return `“${name}” contains no playable games.`;
    outSources.push({ name: name.trim(), text });
  }
  if (total > LAB_LIMITS.totalBytes) return `PGN files may total at most ${LAB_LIMITS.totalBytes / 1024 / 1024} MB.`;

  const notesIn = d.notes && typeof d.notes === 'object' ? (d.notes as Record<string, unknown>) : {};
  if (Object.keys(notesIn).length > LAB_LIMITS.notes) return `At most ${LAB_LIMITS.notes} notes.`;
  const notes: LabData['notes'] = {};
  for (const [k, v] of Object.entries(notesIn)) {
    const n = v as Record<string, unknown>;
    if (!n || typeof n.text !== 'string' || typeof n.moves !== 'string' || n.text.length > LAB_LIMITS.noteChars || k.length > 120 || n.moves.length > 2000) return 'Invalid note.';
    notes[k] = { key: k, moves: n.moves, text: n.text, updated: Number(n.updated) || 0 };
  }

  const statsIn = d.stats && typeof d.stats === 'object' ? (d.stats as Record<string, unknown>) : {};
  if (Object.keys(statsIn).length > LAB_LIMITS.stats) return 'Too many practice statistics.';
  const stats: LabData['stats'] = {};
  for (const [k, v] of Object.entries(statsIn)) {
    const s = v as Record<string, unknown>;
    if (k.length > 200 || !s) return 'Invalid practice statistic.';
    const num = (x: unknown) => Math.max(0, Math.min(1e9, Math.floor(Number(x) || 0)));
    stats[k] = { attempts: num(s.attempts), clean: num(s.clean), last: num(s.last) };
  }

  const side = d.side === 'w' || d.side === 'b' ? d.side : 'auto';
  return { sources: outSources, notes, stats, side };
}

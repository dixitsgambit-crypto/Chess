// Shared by the certifier (scripts/verify-engine.ts) and the validator: how engine verdicts
// are classified and how a puzzle is fingerprinted so certificates go stale when it changes.
import type { Demo, PuzzleTask } from './schema.ts';

export interface DemoCertificate {
  id: string;
  fingerprint: string;
  engine: string;
  depth: number;
  mode: 'win' | 'draw';
  /** For each move by the certified side: its value and whether it stayed in the certified class. */
  plies: { san: string; value: number; ok: boolean; alternatives: number }[];
  ok: boolean;
  verifiedAt: string;
}

export const demoFingerprintSource = (d: Demo) => JSON.stringify({ fen: d.fen, moves: d.moves, verify: d.verify });

export const ACCEPT_THRESHOLDS = { win: 2.5, draw: -0.6, bestWindow: 0.25 } as const;

export interface EngineCertificate {
  id: string;
  fen: string;
  fingerprint: string;
  engine: string;
  depth: number;
  mode: 'best' | 'win' | 'draw';
  /** Moves the engine certifies as solving the task (SAN). */
  accepted: string[];
  /** The strongest move outside the accepted set, if any. */
  bestRejected: { san: string; value: number } | null;
  /** Lowest accepted value minus highest rejected value, in pawns. */
  gap: number;
  evals: { san: string; value: number }[];
  verifiedAt: string;
}

/** What a certificate depends on. Change any of it and the certificate no longer applies. */
export function fingerprintSource(t: PuzzleTask): string {
  return JSON.stringify({ fen: t.fen, solution: t.solution, accept: [...(t.accept ?? [])].sort(), goal: t.goal });
}

/** Classify engine evaluations (side-to-move view, pawns) into accepted moves. */
export function classify(mode: 'best' | 'win' | 'draw', evals: { san: string; value: number }[]) {
  const best = evals[0]?.value ?? -Infinity;
  const floor = mode === 'win' ? ACCEPT_THRESHOLDS.win : mode === 'draw' ? ACCEPT_THRESHOLDS.draw : best - ACCEPT_THRESHOLDS.bestWindow;
  const accepted = evals.filter((e) => e.value >= floor);
  const rejected = evals.filter((e) => e.value < floor);
  const gap = accepted.length ? Math.min(...accepted.map((e) => e.value)) - (rejected[0]?.value ?? -100) : -Infinity;
  return { accepted: accepted.map((e) => e.san), bestRejected: rejected[0] ? { san: rejected[0].san, value: rejected[0].value } : null, gap: Number(gap.toFixed(2)) };
}

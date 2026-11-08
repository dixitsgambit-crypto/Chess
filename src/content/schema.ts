/**
 * Lesson-content schema. Every board position is verified by scripts/validate-content.ts:
 * FEN legality, solution legality, goal (mate / material / KPK result) and that no
 * unlisted move also satisfies the goal.
 */
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Attribution {
  source: string;
  note?: string;
}

export type Goal =
  /** Any move sequence that forces mate in `in` moves is accepted (checked by search). */
  | { type: 'mate'; in: number }
  /** Solver wins at least `minGain` pawns of material; validated by a material search of `depth` plies. */
  | { type: 'material'; minGain: number; depth: number }
  /** A rules exercise: exactly the listed move(s). `rule` is checked by the validator. */
  | { type: 'rule'; rule: 'en-passant' | 'castle' | 'promotion' | 'move' }
  /** King + pawn vs king: any move that keeps this exact outcome for the side to move. */
  | { type: 'kpk'; outcome: 'win' | 'draw' }
  /**
   * Stockfish-certified (scripts/verify-engine.ts → engine-certificates.json). The solution plus
   * `accept` must equal exactly the moves the engine certifies:
   *   best: moves within 0.25 pawns of the engine's best;  win: moves still winning (≥ +2.5);
   *   draw: moves still holding (≥ −0.6). Every other move must be at least `margin` pawns worse.
   * This is strong evidence, not proof: it is an engine judgement at the stated depth.
   */
  | { type: 'engine'; mode: 'best' | 'win' | 'draw'; margin: number; depth: number };

export interface Common {
  id: string;
  prompt: string;
  explanation: string;
  hints: string[];
  difficulty: Difficulty;
  objective: string;
  themes: string[];
}

export interface PuzzleTask extends Common {
  kind: 'puzzle';
  fen: string;
  /** SAN, alternating solver and opponent, beginning with the solver. */
  solution: string[];
  /** Alternative first moves that also fully solve the task. */
  accept?: string[];
  goal: Goal;
  orientation?: 'white' | 'black';
}

export interface ChoiceTask extends Common {
  kind: 'choice';
  fen?: string;
  orientation?: 'white' | 'black';
  options: string[];
  answer: number;
}

export interface SquareTask extends Common {
  kind: 'square';
  fen: string;
  orientation?: 'white' | 'black';
  /** Any one of these squares is correct. */
  answer: string[];
}

export interface PlayoutTask extends Common {
  kind: 'playout';
  fen: string;
  /** mate: deliver checkmate; promote: promote safely (KPK); hold: reach a draw as the defender. */
  goal: 'mate' | 'promote' | 'hold';
  /** Maximum number of the solver's moves. */
  maxMoves: number;
  /** Who defends: Stockfish or the exact KPK solver. */
  opponent: 'stockfish' | 'kpk';
  orientation?: 'white' | 'black';
}

export type Task = PuzzleTask | ChoiceTask | SquareTask | PlayoutTask;

export interface Demo {
  fen: string;
  moves: string[];
  /** captions[0] describes the start; captions[i + 1] is shown after moves[i]. */
  captions: string[];
  orientation?: 'white' | 'black';
  /**
   * Engine-certify the line: every move by the side to move at the start must keep the
   * stated result (Stockfish, see scripts/verify-engine.ts). Required when captions make
   * claims ("this keeps the win") that the exact checkers cannot prove.
   */
  verify?: { mode: 'win' | 'draw'; depth: number };
}

export type KingdomId = 'foundation' | 'tactics' | 'strategy' | 'openings' | 'calculation' | 'endgames' | 'tournament' | 'gm-mind' | 'masters' | 'championship';

export interface Lesson {
  id: string;
  kingdom: KingdomId;
  title: string;
  topics: string[];
  summary: string;
  intro: string;
  objectives: string[];
  concept: string[];
  demo: Demo;
  guided: Task[];
  independent: Task[];
  application: Task[];
  exam: Task[];
  prerequisites: string[];
  attribution: Attribution;
}

export interface Kingdom {
  id: KingdomId;
  order: number;
  name: string;
  epithet: string;
  emblem: string; // chess glyph
  description: string;
  topics: string[];
  lessons: Lesson[];
  boss?: { name: string; intro: string; tasks: Task[] };
  /** Map coordinates (0-100). */
  map: { x: number; y: number };
}

export const ORIGINAL: Attribution = { source: 'Chessverse Academy original exercise', note: 'Composed for this course and verified with chess.js.' };
export const RULES: Attribution = { source: 'FIDE Laws of Chess (rules of play)', note: 'Exercise composed for this course.' };
export const KPK_VERIFIED: Attribution = { source: 'Chessverse Academy original exercise', note: 'Result verified by the built-in exact K+P vs K solver.' };

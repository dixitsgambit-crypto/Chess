import type { Kingdom, Lesson, Task } from './schema.ts';
import { FOUNDATION_BOSS, FOUNDATION_LESSONS } from './foundation.ts';
import { TACTICS_BOSS, TACTICS_LESSONS } from './tactics.ts';
import { TACTICS2_LESSONS } from './tactics2.ts';
import { ENDGAME_BOSS, ENDGAME_LESSONS } from './endgames.ts';
import { CALCULATION_BOSS, CALCULATION_LESSONS } from './calculation.ts';

export const KINGDOMS: Kingdom[] = [
  {
    id: 'foundation', order: 1, name: 'Foundation Realm', epithet: 'Where every journey begins', emblem: '♙',
    description: 'The rules, the board and the first checkmates — the bedrock of the game.',
    topics: ['Board coordinates', 'Chess notation', 'Piece movements', 'Legal moves', 'Captures', 'Check', 'Checkmate', 'Stalemate', 'Castling', 'En passant', 'Promotion', 'Material value', 'Basic checkmates', 'Chess principles', 'Introduction to PGN'],
    lessons: FOUNDATION_LESSONS,
    boss: { name: 'The Gatekeeper', intro: 'Six unseen positions across the whole realm. Score 80% at the first attempt to open the gate to the Tactical Kingdom.', tasks: FOUNDATION_BOSS },
    map: { x: 14, y: 78 },
  },
  {
    id: 'tactics', order: 2, name: 'Tactical Kingdom', epithet: 'Steel, speed and sudden blows', emblem: '♘',
    description: 'Forks, pins, skewers, discoveries and the mating patterns they lead to.',
    topics: ['Hanging pieces', 'Forks', 'Knight forks', 'Pins', 'Skewers', 'Discovered attacks', 'Discovered checks', 'Double checks', 'Deflection', 'Decoy', 'Attraction', 'Removing the defender', 'Interference', 'Clearance', 'X-ray attacks', 'Zwischenzug', 'Defensive tactics', 'Tactical combinations', 'Mating patterns'],
    lessons: [...TACTICS_LESSONS, ...TACTICS2_LESSONS],
    boss: { name: 'The Knight-Captain', intro: 'Five unseen tactical blows. Score 80% at the first attempt to earn the Captain’s seal.', tasks: TACTICS_BOSS },
    map: { x: 30, y: 58 },
  },
  {
    id: 'strategy', order: 3, name: 'Strategic Empire', epithet: 'Plans that outlast tactics', emblem: '♗',
    description: 'Pawn structures, outposts, weak squares and long-term planning.',
    topics: ['Central control', 'Piece activity', 'Development', 'Open files', 'Pawn structures', 'Isolated pawns', 'Doubled pawns', 'Backward pawns', 'Hanging pawns', 'Pawn chains', 'Pawn breaks', 'Passed pawns', 'Outposts', 'Weak squares', 'Bishop pair', 'Good and bad bishops', 'Knight versus bishop', 'Space advantage', 'King safety', 'Prophylaxis', 'Worst-placed piece', 'Weakness creation', 'Strategic planning', 'Positional sacrifices'],
    lessons: [], map: { x: 22, y: 34 },
  },
  {
    id: 'openings', order: 4, name: 'Opening Empire', epithet: 'The first moves of every war', emblem: '♖',
    description: 'Principles, traps and full repertoire courses for White and Black.',
    topics: ['Opening principles', 'Centre control', 'Development', 'King safety', 'Opening traps', 'Opening mistakes', 'Opening theory', 'Repertoire building', 'Transpositions', 'Pawn structures', 'Typical plans', 'Critical positions', 'Opening databases', 'Model games', 'Opponent preparation'],
    lessons: [], map: { x: 44, y: 22 },
  },
  {
    id: 'calculation', order: 5, name: 'Calculation Temple', epithet: 'See further than your rival', emblem: '♕',
    description: 'Candidate moves, forcing lines and the discipline of accurate calculation.',
    topics: ['Candidate moves', 'Forcing moves', 'Checks, captures and threats', 'Variation calculation', 'Position evaluation', 'Visualisation', 'Quiet moves', 'Defensive calculation', 'Sacrifice calculation', 'Tree of variations', 'Calculation accuracy', 'Time management', 'Practical decisions'],
    lessons: CALCULATION_LESSONS,
    boss: { name: 'The Oracle', intro: 'Five unseen mates in two. Every defence must be foreseen. Score 80% at the first attempt.', tasks: CALCULATION_BOSS },
    map: { x: 52, y: 46 },
  },
  {
    id: 'endgames', order: 6, name: 'Endgame Citadel', epithet: 'Where games are truly won', emblem: '♔',
    description: 'King activity, pawn endings, rook endings and the theoretical positions every player must know.',
    topics: ['King activity', 'King and pawn endings', 'Opposition', 'Distant opposition', 'Triangulation', 'Key squares', 'Passed pawns', 'Pawn breakthroughs', 'Rook endings', 'Lucena', 'Philidor', 'Rook activity', 'Bishop endings', 'Knight endings', 'Bishop versus knight', 'Same-coloured bishop endings', 'Opposite-coloured bishop endings', 'Queen endings', 'Theoretical draws', 'Practical endgame technique'],
    lessons: ENDGAME_LESSONS,
    boss: { name: 'The Citadel Warden', intro: 'Four unseen endgame trials, judged by the exact solver. Score 80% at the first attempt.', tasks: ENDGAME_BOSS },
    map: { x: 66, y: 70 },
  },
  {
    id: 'tournament', order: 7, name: 'Tournament Arena', epithet: 'The clock is ticking', emblem: '⏳',
    description: 'Rules, clocks, nerves and preparation: competing well.',
    topics: ['Tournament rules', 'Clock management', 'Time pressure', 'Opponent preparation', 'Opening preparation', 'Tournament psychology', 'Winning positions', 'Difficult defensive positions', 'Draw decisions', 'Post-game analysis', 'Multi-round tournaments', 'Competitive preparation'],
    lessons: [], map: { x: 78, y: 50 },
  },
  {
    id: 'gm-mind', order: 8, name: "Grandmaster's Mind", epithet: 'Beyond the rules of thumb', emblem: '♛',
    description: 'Initiative, compensation, transformation of advantages and imbalanced play.',
    topics: ['Dynamic versus static advantages', 'Initiative', 'Exchange sacrifices', 'Positional sacrifices', 'Compensation', 'Prophylaxis', 'Restriction', 'Critical positions', 'Complex pawn structures', 'Transformation of advantages', 'Opposite-side castling', 'King attacks', 'Defensive resources', 'Advanced positional planning', 'Imbalanced positions'],
    lessons: [], map: { x: 70, y: 28 },
  },
  {
    id: 'masters', order: 9, name: "Masters' Library", epithet: 'Lessons from the immortals', emblem: '📜',
    description: 'Courses on the characteristic ideas of the world champions, built from verified game scores.',
    topics: ['Morphy', 'Capablanca', 'Alekhine', 'Botvinnik', 'Tal', 'Petrosian', 'Fischer', 'Karpov', 'Kasparov', 'Anand', 'Carlsen'],
    lessons: [], map: { x: 86, y: 16 },
  },
  {
    id: 'championship', order: 10, name: 'Championship Realm', epithet: 'The final examination', emblem: '♚',
    description: 'Comprehensive final examinations across every kingdom, with a detailed graduation report.',
    topics: ['Tactical vision', 'Calculation', 'Positional understanding', 'Opening repertoire', 'Endgames', 'Master games', 'Tournament preparation', 'Practical decision-making', 'Complete game analysis'],
    lessons: [], map: { x: 90, y: 40 },
  },
];

export const ALL_LESSONS: Lesson[] = KINGDOMS.flatMap((k) => k.lessons);
export const lessonById = (id: string) => ALL_LESSONS.find((l) => l.id === id);
export const kingdomById = (id: string) => KINGDOMS.find((k) => k.id === id);

export type Stage = 'guided' | 'independent' | 'application' | 'exam' | 'boss' | 'placement';

export interface TaskRef { task: Task; stage: Stage; lessonId?: string; kingdomId: string }

/** Every task in the curriculum, with the stage it belongs to. */
export function allTasks(): TaskRef[] {
  const out: TaskRef[] = [];
  for (const k of KINGDOMS) {
    for (const l of k.lessons) {
      for (const stage of ['guided', 'independent', 'application', 'exam'] as const)
        for (const task of l[stage]) out.push({ task, stage, lessonId: l.id, kingdomId: k.id });
    }
    for (const task of k.boss?.tasks ?? []) out.push({ task, stage: 'boss', kingdomId: k.id });
  }
  return out;
}

export const taskById = (id: string) => allTasks().find((r) => r.task.id === id);

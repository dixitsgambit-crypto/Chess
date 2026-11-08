// Calculation Temple. Every mate-in-two was found by scripts/mine-positions.ts and is
// re-verified (including every defence) by scripts/validate-content.ts.
import type { Lesson, Task } from './schema.ts';

const MINED = { source: 'Chessverse Academy original exercise', note: 'Found by the academy position miner and verified by exhaustive mate search.' };

const forcing: Lesson = {
  id: 'c-forcing',
  kingdom: 'calculation',
  title: 'Checks, Captures and Threats',
  topics: ['Forcing moves', 'Checks, captures and threats', 'Candidate moves'],
  summary: 'Look at the forcing moves first — they limit what the opponent can do.',
  intro: 'Strong players do not look at every move. They start with the most forcing ones: checks, then captures, then threats. Forcing moves cut the opponent’s choices to a handful, which is what makes deep calculation possible.',
  objectives: ['Scan checks, captures and threats in order', 'Calculate a two-move forcing line to the end', 'Check every defence before you play'],
  concept: [
    'Checks first: the opponent must answer a check, usually with only a few legal moves.',
    'Then captures: they change the material and often force a recapture.',
    'Then threats: moves that attack something and demand a reply.',
    'For each forcing move, list every defence — every king move, block and capture — and make sure you have an answer to each. Only then play the move.',
  ],
  demo: {
    fen: '7k/1p3pbp/5p2/7N/8/4R3/PP4PP/2K5 w - - 0 1',
    moves: ['Re8+', 'Bf8', 'Rxf8#'],
    captions: [
      'White to move. Start the scan: which checks are there?',
      '1.Re8+ — a check on the back rank. Black has exactly one answer.',
      '…Bf8 is the only block (the king has no square).',
      '2.Rxf8# — the knight on h5 covers g7, so the king is mated.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'c-forc.g1', fen: '5rk1/1p3pp1/2N2pp1/8/8/6R1/P4P1P/6K1 w - - 0 1', solution: ['Ne7+', 'Kh8', 'Rh3#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two. Start with the checks.', explanation: '1.Ne7+ leaves the king only h8 or h7; either way 2.Rh3# follows on the open h-file.', hints: ['Which pieces can give check?', 'After the knight check, where can the king go?'], difficulty: 2, objective: 'Calculate a two-move forcing line to the end', themes: ['forcing moves', 'mate in 2'] },
    { kind: 'choice', id: 'c-forc.g2', prompt: 'In what order do strong players scan forcing moves?', options: ['Checks, captures, threats', 'Pawn moves first', 'Threats, then quiet moves, then checks', 'The first move that looks good'], answer: 0, explanation: 'Checks are the most forcing, then captures, then threats.', hints: [], difficulty: 1, objective: 'Scan checks, captures and threats in order', themes: ['forcing moves'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'c-forc.i1', fen: '1n4k1/Bp4pp/5ppp/8/6Q1/8/1P6/2K5 w - - 0 1', solution: ['Qe6+', 'Kh8', 'Qc8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qe6+ and both king moves lose: 1…Kh8 2.Qc8# (or Qe8#), and 1…Kf8 2.Bc5#.', hints: ['Find the queen check.', 'Check both king moves after it.'], difficulty: 3, objective: 'Check every defence before you play', themes: ['forcing moves', 'mate in 2'] },
    { kind: 'puzzle', id: 'c-forc.i2', fen: 'r6k/pp3p2/5ppp/q3B3/5Q2/2R5/1P3PPP/6K1 w - - 0 1', solution: ['Qxf6+', 'Kh7', 'Qxf7#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxf6+ — a capture with check, the most forcing move of all. After 1…Kh7 2.Qxf7# (or Qg7#); after 1…Kg8 2.Qg7# (or Qh8#).', hints: ['Look for a capture that is also a check.'], difficulty: 2, objective: 'Scan checks, captures and threats in order', themes: ['forcing moves', 'mate in 2'] },
  ],
  application: [
    { kind: 'puzzle', id: 'c-forc.a1', fen: '6k1/p1q1R3/8/b6n/5NB1/8/5PPP/6K1 w - - 0 1', solution: ['Be6+', 'Kh8', 'Ng6#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Be6+ and the king must step to h8 or f8; in both cases 2.Ng6# finishes.', hints: ['Which check takes away the most squares?'], difficulty: 3, objective: 'Calculate a two-move forcing line to the end', themes: ['forcing moves', 'mate in 2'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'c-forc.e1', fen: '7k/pp3R1p/6pp/4q3/B7/6Q1/5P1P/7K w - - 0 1', solution: ['Qxe5+', 'Kg8', 'Qe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxe5+ wins the queen with check; after 1…Kg8, 2.Qe8# (or 2.Qg7#).', hints: [], difficulty: 2, objective: 'Scan checks, captures and threats in order', themes: ['forcing moves', 'mate in 2'] },
    { kind: 'puzzle', id: 'c-forc.e2', fen: '6k1/rR2Qp2/6pp/4r3/7B/8/5PP1/6K1 w - - 0 1', solution: ['Qxf7+', 'Kh8', 'Qf8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxf7+ Kh8 and White has several mates, for example 2.Qf8#.', hints: [], difficulty: 2, objective: 'Calculate a two-move forcing line to the end', themes: ['forcing moves', 'mate in 2'] },
    { kind: 'choice', id: 'c-forc.e3', prompt: 'You found a check that looks strong. What must you do before playing it?', options: ['Check every legal reply and make sure each one loses', 'Play it immediately', 'Look only at the most natural reply', 'Ask the engine'], answer: 0, explanation: 'Calculation means checking all of the opponent’s defences, not just the one you hope for.', hints: [], difficulty: 1, objective: 'Check every defence before you play', themes: ['calculation'] },
  ],
  prerequisites: ['t-mating-patterns'],
  attribution: MINED,
};

const candidates: Lesson = {
  id: 'c-candidates',
  kingdom: 'calculation',
  title: 'Candidate Moves and the Tree of Variations',
  topics: ['Candidate moves', 'Variation calculation', 'Tree of variations', 'Visualisation'],
  summary: 'List the candidates, then follow each branch to the end before choosing.',
  intro: 'When several forcing moves look promising, list them all as candidates and calculate each branch. The tree of variations is the picture of that work: each candidate a branch, each defence a twig.',
  objectives: ['List all candidate moves before calculating', 'Follow each branch to a clear verdict', 'Visualise the final position without moving the pieces'],
  concept: [
    'Write (or say) your candidates first: usually two to four forcing moves.',
    'Calculate one branch at a time. For each, list the opponent’s replies and find your answer to each.',
    'Stop a branch only at a clear verdict: mate, a decisive material gain, or “this does not work”.',
    'Visualise: the final position exists only in your head. Ask which squares around the enemy king are covered there.',
  ],
  demo: {
    fen: 'R2n2k1/1pN2p1p/5p1p/1r1b4/1R6/8/PP4PP/2K5 w - - 0 1',
    moves: ['Rxd8+', 'Kg7', 'Rg4#'],
    captions: [
      'White to move. First list the candidates — the checks and captures — then calculate each one.',
      '1.Rxd8+ removes the knight with check. Only one reply.',
      '1…Kg7 — the king runs.',
      '2.Rg4# — the second rook finishes on the g-file.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'c-cand.g1', fen: 'N5k1/1p1qQ2R/5pp1/7b/8/8/1P3P2/7K w - - 0 1', solution: ['Rg7+', 'Kh8', 'Qf8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two. List your checks first.', explanation: '1.Rg7+ forces 1…Kh8, and 2.Qf8# follows: the rook on g7 covers the king’s last square.', hints: ['Your candidates are the checks by queen and rook.', 'Which check leaves the king a single square?'], difficulty: 2, objective: 'List all candidate moves before calculating', themes: ['candidate moves', 'mate in 2'] },
    { kind: 'choice', id: 'c-cand.g2', prompt: 'When do you stop calculating a branch?', options: ['When it reaches a clear verdict — mate, decisive material, or a refutation', 'After exactly two moves', 'As soon as it looks good', 'Never'], answer: 0, explanation: 'Calculate until the outcome is clear; a branch that only “looks good” has not been calculated.', hints: [], difficulty: 1, objective: 'Follow each branch to a clear verdict', themes: ['calculation'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'c-cand.i1', fen: '6k1/pr4p1/2n2pQp/7r/6N1/7B/PP4PP/6K1 w - - 0 1', solution: ['Nxf6+', 'Kh8', 'Qe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Nxf6+ and both king moves lose: 1…Kh8 2.Qe8# (or Qh7#), 1…Kf8 2.Qe8#.', hints: ['Candidates: every check and capture near the king.'], difficulty: 3, objective: 'Follow each branch to a clear verdict', themes: ['candidate moves', 'mate in 2'] },
    { kind: 'puzzle', id: 'c-cand.i2', fen: '1q3k2/pp3r1p/2R4p/8/5Q2/4R3/7P/2K5 w - - 0 1', solution: ['Qxb8+', 'Kg7', 'Rg3#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxb8+ Kg7 2.Rg3#. The capture with check drives the king into the rook’s path.', hints: ['Where will the king go after a check on the back rank?'], difficulty: 3, objective: 'Visualise the final position without moving the pieces', themes: ['candidate moves', 'mate in 2'] },
  ],
  application: [
    { kind: 'puzzle', id: 'c-cand.a1', fen: '6k1/p1R2p1p/q4p1p/3r1n2/1R6/4Q3/PP3PPP/2K5 w - - 0 1', solution: ['Qe8+', 'Kg7', 'Rg4#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qe8+ Kg7 2.Rg4#. The queen check drives the king to g7, and the b4-rook swings across to g4 with mate.', hints: ['Picture where the king stands after your check.'], difficulty: 3, objective: 'Visualise the final position without moving the pieces', themes: ['visualisation', 'mate in 2'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'c-cand.e1', fen: '6k1/1q4rp/3R1ppp/n1Q5/8/4R3/P5P1/7K w - - 0 1', solution: ['Rd8+', 'Kf7', 'Rf8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rd8+ Kf7 2.Rf8# (or 2.Qf8#).', hints: [], difficulty: 3, objective: 'Follow each branch to a clear verdict', themes: ['candidate moves', 'mate in 2'] },
    { kind: 'puzzle', id: 'c-cand.e2', fen: '5kq1/1p4pp/1Q1RR1pp/2b5/8/8/PP4P1/2K5 w - - 0 1', solution: ['Qd8+', 'Kf7', 'Qe7#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qd8+ Kf7 2.Qe7# (or 2.Re7#).', hints: [], difficulty: 3, objective: 'Visualise the final position without moving the pieces', themes: ['candidate moves', 'mate in 2'] },
    { kind: 'choice', id: 'c-cand.e3', prompt: 'What is a “candidate move”?', options: ['A move you will calculate seriously before deciding', 'The first move you see', 'Any legal move', 'A move suggested by an engine'], answer: 0, explanation: 'Candidates are the short list of serious options you calculate before choosing.', hints: [], difficulty: 1, objective: 'List all candidate moves before calculating', themes: ['candidate moves'] },
  ],
  prerequisites: ['c-forcing'],
  attribution: MINED,
};

export const CALCULATION_LESSONS = [forcing, candidates];

export const CALCULATION_BOSS: Task[] = [
  { kind: 'puzzle', id: 'c-boss.1', fen: 'R3b1k1/p3Rp1p/1q3p2/8/3Q4/8/7P/2K5 w - - 0 1', solution: ['Qg4+', 'Kh8', 'Raxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qg4+ and after either king move a rook takes on e8 with mate.', hints: [], difficulty: 3, objective: 'Calculate a two-move forcing line to the end', themes: ['mate in 2'] },
  { kind: 'puzzle', id: 'c-boss.2', fen: '4n1k1/pp3b1p/2r2Qpp/3B4/8/7R/6PP/6K1 w - - 0 1', solution: ['Qxf7+', 'Kh8', 'Qf8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxf7+ Kh8 2.Qf8# (or 2.Qg8#).', hints: [], difficulty: 2, objective: 'Scan checks, captures and threats in order', themes: ['mate in 2'] },
  { kind: 'puzzle', id: 'c-boss.3', fen: '3q2k1/pp4p1/b7/3RN1R1/8/8/PP4PP/2K5 w - - 0 1', solution: ['Rxd8+', 'Kh7', 'Rh5#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxd8+ Kh7 2.Rh5#.', hints: [], difficulty: 3, objective: 'Visualise the final position without moving the pieces', themes: ['mate in 2'] },
  { kind: 'puzzle', id: 'c-boss.4', fen: '1BRr2kN/7r/6pp/8/8/8/P4P2/6K1 w - - 0 1', solution: ['Rxd8+', 'Kg7', 'Be5#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxd8+ Kg7 2.Be5#.', hints: [], difficulty: 3, objective: 'Follow each branch to a clear verdict', themes: ['mate in 2'] },
  { kind: 'puzzle', id: 'c-boss.5', fen: '3NB1k1/1p2Rppp/5ppp/3r4/8/8/PP3P2/2K5 w - - 0 1', solution: ['Bxf7+', 'Kh8', 'Re8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Bxf7+ and after either king move, 2.Re8#.', hints: [], difficulty: 3, objective: 'Check every defence before you play', themes: ['mate in 2'] },
];

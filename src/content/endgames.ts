import { KPK_VERIFIED, type Lesson, type Task } from './schema.ts';

const opposition: Lesson = {
  id: 'e-opposition',
  kingdom: 'endgames',
  title: 'King Activity and the Opposition',
  topics: ['King activity', 'King and pawn endings', 'Opposition'],
  summary: 'In pawn endings the king is a fighting piece — and one tempo decides everything.',
  intro: 'With few pieces left, the king becomes strong. In king-and-pawn endings, the result often depends on which king “holds the opposition”.',
  objectives: ['Explain the opposition', 'Take the opposition to win', 'Take the opposition to defend'],
  concept: [
    'Two kings stand in opposition when they face each other on the same file (or rank) with exactly one square between them.',
    'The side NOT to move “has the opposition”: the other king must give way and let it pass.',
    'Attacking: take the opposition so the defending king must step aside, then advance. Defending: take the opposition in front of the pawn so the attacker cannot get through.',
    'Every result in this lesson is verified by an exact king-and-pawn solver built into the academy.',
  ],
  demo: {
    fen: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1',
    moves: ['Kd3'],
    captions: [
      'White to move. Every king move except one, and both pawn moves, only draw.',
      '1.Kd3! takes the opposition directly in front of the pawn. Black to move must give way, and White wins.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'e-opp.g1', fen: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1', solution: ['Kd3'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win. Take the opposition.', explanation: 'Kd3 stands opposite the black king with one square between them, and Black must move. Any other move draws.', hints: ['Put your king directly opposite Black’s, one square apart.', 'Do not push the pawn yet.'], difficulty: 2, objective: 'Take the opposition to win', themes: ['opposition'] },
    { kind: 'choice', id: 'e-opp.g2', fen: '8/4k3/8/4K3/4P3/8/8/8 w - - 0 1', prompt: 'White to move. With best play, what is the result?', options: ['White wins', 'Draw', 'Black wins'], answer: 1, explanation: 'The kings are in opposition and White must move, so Black has the opposition and holds the draw.', hints: ['Who has to move?'], difficulty: 2, objective: 'Explain the opposition', themes: ['opposition'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'e-opp.i1', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', solution: ['Kd6'], accept: ['Kf6'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'Kd6 (or Kf6) keeps the king on the 6th rank next to the pawn. Kd5 or Kf5 retreats and only draws.', hints: ['Keep your king on the 6th rank.'], difficulty: 2, objective: 'Take the opposition to win', themes: ['opposition'] },
    { kind: 'puzzle', id: 'e-opp.i2', fen: '8/8/8/4k3/8/4PK2/8/8 b - - 0 1', orientation: 'black', solution: ['Kf5'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Kf5 takes the opposition against the white king. Every other move lets White’s king advance and win.', hints: ['Stand opposite the white king.'], difficulty: 3, objective: 'Take the opposition to defend', themes: ['opposition', 'defence'] },
  ],
  application: [
    { kind: 'playout', id: 'e-opp.a1', fen: '8/8/2k5/8/8/2K5/2P5/8 w - - 0 1', goal: 'promote', maxMoves: 20, opponent: 'kpk', prompt: 'White to move. Promote the pawn safely against perfect defence.', explanation: 'Lead with the king, use the opposition, and only push the pawn when your king controls the squares in front of it.', hints: ['Advance the king first.', 'When the kings meet, make sure the defender has to move.'], difficulty: 3, objective: 'Take the opposition to win', themes: ['opposition', 'technique'] },
    { kind: 'playout', id: 'e-opp.a2', fen: '8/8/8/4k3/8/4PK2/8/8 b - - 0 1', orientation: 'black', goal: 'hold', maxMoves: 15, opponent: 'kpk', prompt: 'Black to move. Hold the draw for 15 moves against perfect attack.', explanation: 'Stay in front of the pawn and take the opposition whenever the white king approaches.', hints: ['Keep your king in front of the pawn.'], difficulty: 3, objective: 'Take the opposition to defend', themes: ['opposition', 'defence'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'e-opp.e1', fen: '8/8/8/2k5/8/8/2PK4/8 w - - 0 1', solution: ['Kc3'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'Kc3 takes the opposition in front of the pawn; everything else draws.', hints: [], difficulty: 2, objective: 'Take the opposition to win', themes: ['opposition'] },
    { kind: 'puzzle', id: 'e-opp.e2', fen: '8/8/8/3k4/8/3PK3/8/8 b - - 0 1', orientation: 'black', solution: ['Ke5'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Ke5 takes the opposition. Every other move loses.', hints: [], difficulty: 3, objective: 'Take the opposition to defend', themes: ['opposition', 'defence'] },
    { kind: 'choice', id: 'e-opp.e3', prompt: 'Two kings face each other on the same file with one square between them. Who has the opposition?', options: ['The side to move', 'The side NOT to move', 'The side with the pawn', 'Neither'], answer: 1, explanation: 'The side not to move has the opposition, because the other king must give way.', hints: [], difficulty: 1, objective: 'Explain the opposition', themes: ['opposition'] },
  ],
  prerequisites: ['f-basic-mates'],
  attribution: KPK_VERIFIED,
};

const keySquares: Lesson = {
  id: 'e-key-squares',
  kingdom: 'endgames',
  title: 'Key Squares and the Rule of the Square',
  topics: ['Key squares', 'Passed pawns', 'King and pawn endings'],
  summary: 'Know where your king must stand — and whether the enemy king can catch your pawn.',
  intro: 'Two quick calculation tools: key squares tell the attacker where the king must go; the rule of the square tells the defender whether a pawn can be caught.',
  objectives: ['Lead with the king to reach key squares', 'Use the rule of the square', 'Avoid pushing the pawn too early'],
  concept: [
    'Key squares: if the attacking king reaches one of them, the pawn queens whatever the defender does. For a pawn on the 2nd, 3rd or 4th rank (not a rook’s pawn), they are the three squares two ranks in front of it — for a pawn on e4: d6, e6 and f6.',
    'So lead with the king. Pushing the pawn early moves the key squares further away from your king.',
    'Rule of the square: draw a square from the pawn to its promotion rank. If the defending king is inside it — or can step inside on its move — it catches the pawn (with no other pieces involved).',
  ],
  demo: {
    fen: '8/4k3/8/8/3K4/8/4P3/8 w - - 0 1',
    moves: ['Ke5'],
    captions: [
      'White to move. Here every king move wins, but both pawn moves throw the win away.',
      '1.Ke5 — the king leads. The pawn will follow once the king controls the squares in front of it.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'e-key.g1', fen: '8/4k3/8/8/3K4/8/4P3/8 w - - 0 1', solution: ['Ke5'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win. Will you move the king or the pawn?', explanation: 'Any king move keeps the win; e3 or e4 lets Black’s king get in front of the pawn and draw.', hints: ['Lead with the king.'], difficulty: 1, objective: 'Avoid pushing the pawn too early', themes: ['key squares'] },
    { kind: 'puzzle', id: 'e-key.g2', fen: '8/8/8/6k1/1P6/8/8/7K b - - 0 1', orientation: 'black', solution: ['Kf5'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move. Catch the pawn: step into its square.', explanation: 'The square of the b4-pawn runs b4–b8–f8–f4. …Kf5 (or …Kf4 / …Kf6) steps inside and the pawn is caught.', hints: ['Draw the square from b4 to b8 and across to the f-file.'], difficulty: 2, objective: 'Use the rule of the square', themes: ['rule of the square'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'e-key.i1', fen: '8/8/3k4/8/8/3K4/3P4/8 w - - 0 1', solution: ['Kd4'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'Kc4, Kd4 or Ke4 — advance the king to the 4th rank, heading for the key squares. Retreating or pushing draws.', hints: ['Move forward with the king.'], difficulty: 2, objective: 'Lead with the king to reach key squares', themes: ['key squares'] },
    { kind: 'puzzle', id: 'e-key.i2', fen: '3k4/8/3K4/3P4/8/8/8/8 w - - 0 1', solution: ['Ke6'], accept: ['Kc6'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'Ke6 (or Kc6) keeps the king on the 6th rank beside the pawn’s path. Kc5 or Ke5 retreats and draws.', hints: ['Stay on the 6th rank.'], difficulty: 3, objective: 'Lead with the king to reach key squares', themes: ['key squares', 'opposition'] },
  ],
  application: [
    { kind: 'playout', id: 'e-key.a1', fen: '8/4k3/8/8/3K4/8/4P3/8 w - - 0 1', goal: 'promote', maxMoves: 20, opponent: 'kpk', prompt: 'White to move. Promote safely against perfect defence.', explanation: 'King first, then the pawn — and keep the opposition in mind.', hints: ['Aim your king at d6, e6 or f6.'], difficulty: 3, objective: 'Lead with the king to reach key squares', themes: ['key squares', 'technique'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'e-key.e1', fen: '8/8/8/6k1/1P6/8/8/7K w - - 0 1', solution: ['b5'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'b5! moves the square to b5–b8–e8–e5, and the black king on g5 cannot step into it. Any king move lets Black catch the pawn.', hints: [], difficulty: 2, objective: 'Use the rule of the square', themes: ['rule of the square'] },
    { kind: 'puzzle', id: 'e-key.e2', fen: '8/8/8/8/5k2/8/5PK1/8 b - - 0 1', orientation: 'black', solution: ['Kg4'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Kg4 takes the opposition against the white king; every other move loses.', hints: [], difficulty: 3, objective: 'Lead with the king to reach key squares', themes: ['opposition', 'defence'] },
    { kind: 'choice', id: 'e-key.e3', prompt: 'A white pawn stands on e4 (with no other pawns). What are its key squares?', options: ['d5, e5, f5', 'd6, e6, f6', 'e7 and e8', 'd3, e3, f3'], answer: 1, explanation: 'For a pawn on its 2nd–4th rank the key squares lie two ranks in front: d6, e6, f6.', hints: [], difficulty: 2, objective: 'Lead with the king to reach key squares', themes: ['key squares'] },
  ],
  prerequisites: ['e-opposition'],
  attribution: KPK_VERIFIED,
};

const distant: Lesson = {
  id: 'e-distant-opposition',
  kingdom: 'endgames',
  title: 'Distant Opposition',
  topics: ['Distant opposition', 'King and pawn endings', 'King activity'],
  summary: 'Win the opposition from far away — before the kings even meet.',
  intro: 'The fight for the opposition often starts long before the kings are face to face. With three squares between them, the same counting rule decides who will win the close-range duel.',
  objectives: ['Recognise distant opposition', 'Take the distant opposition as the attacker', 'Take the distant opposition as the defender'],
  concept: [
    'Distant opposition: the kings stand on the same file (or rank) with an odd number of squares between them — usually three.',
    'As with direct opposition, the side that has just moved into it, so that the other side must move, holds it.',
    'Keep it as the kings approach: each time the opponent steps forward, step forward too, and the distant opposition becomes the direct opposition at the critical moment.',
    'Practical rule: when the kings are far apart, count the squares between them on the file before you move.',
  ],
  demo: {
    fen: '4k3/8/8/8/8/2P2K2/8/8 w - - 0 1',
    moves: ['Ke4'],
    captions: [
      'White to move. The kings are far apart, and every move but one throws the win away.',
      '1.Ke4! The kings now face each other on the e-file with three squares between: distant opposition, with Black to move. Black must give ground, and White’s king will reach the key squares.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'e-dist.g1', fen: '5k2/8/8/8/8/2P3K1/8/8 w - - 0 1', solution: ['Kf4'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win. Take the distant opposition.', explanation: 'Kf4 puts the kings on the f-file with three squares between them, and Black must move. Every other move lets Black hold.', hints: ['Count the squares between the kings on a file.', 'Put your king on Black’s file with three squares between.'], difficulty: 2, objective: 'Take the distant opposition as the attacker', themes: ['distant opposition'] },
    { kind: 'choice', id: 'e-dist.g2', prompt: 'White king on e4, black king on e8, Black to move. Who has the opposition?', options: ['White — distant opposition', 'Black', 'Nobody: the kings are too far apart', 'Whoever has the pawn'], answer: 0, explanation: 'Three squares between them on the same file is distant opposition, and the side not to move — White — holds it.', hints: ['Count the squares between e4 and e8.'], difficulty: 1, objective: 'Recognise distant opposition', themes: ['distant opposition'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'e-dist.i1', fen: '6k1/8/8/8/8/2P4K/8/8 w - - 0 1', solution: ['Kg4'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'Kg4: distant opposition on the g-file. Everything else draws.', hints: ['Find the black king’s file.'], difficulty: 3, objective: 'Take the distant opposition as the attacker', themes: ['distant opposition'] },
    { kind: 'puzzle', id: 'e-dist.i2', fen: '8/4k3/8/8/8/2PK4/8/8 b - - 0 1', orientation: 'black', solution: ['Kd7'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Kd7 meets the white king on the d-file with three squares between: distant opposition for the defender. Every other move loses.', hints: ['Defenders use the opposition too.'], difficulty: 3, objective: 'Take the distant opposition as the defender', themes: ['distant opposition', 'defence'] },
  ],
  application: [
    { kind: 'playout', id: 'e-dist.a1', fen: '4k3/8/8/8/2PK4/8/8/8 b - - 0 1', orientation: 'black', goal: 'hold', maxMoves: 15, opponent: 'kpk', prompt: 'Black to move. Hold the draw for 15 moves against perfect attack.', explanation: 'Start with the distant opposition (…Kd8) and keep it as the white king approaches.', hints: ['Stand on the white king’s file with three squares between.'], difficulty: 3, objective: 'Take the distant opposition as the defender', themes: ['distant opposition', 'defence'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'e-dist.e1', fen: '8/2k5/8/8/8/1KP5/8/8 b - - 0 1', orientation: 'black', solution: ['Kb7'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Kb7 takes the distant opposition on the b-file. Every other move loses.', hints: [], difficulty: 3, objective: 'Take the distant opposition as the defender', themes: ['distant opposition'] },
    { kind: 'puzzle', id: 'e-dist.e2', fen: '2k5/8/8/8/1KP5/8/8/8 b - - 0 1', orientation: 'black', solution: ['Kb8'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Kb8: distant opposition against the king on b4.', hints: [], difficulty: 3, objective: 'Take the distant opposition as the defender', themes: ['distant opposition'] },
    { kind: 'choice', id: 'e-dist.e3', prompt: 'Which pair of king squares is in distant opposition?', options: ['e2 and e6', 'e2 and e5', 'e2 and f6', 'e2 and e4'], answer: 0, explanation: 'e2 and e6 are on the same file with three squares between them. e2–e4 is direct opposition; the others are not opposition at all.', hints: [], difficulty: 2, objective: 'Recognise distant opposition', themes: ['distant opposition'] },
  ],
  prerequisites: ['e-key-squares'],
  attribution: KPK_VERIFIED,
};

const ENGINE = { source: 'Chessverse Academy original exercise', note: 'Positions found and certified with Stockfish 16 NNUE (scripts/verify-engine.ts). Engine-verified, not tablebase-proven.' };

const rookEndings: Lesson = {
  id: 'e-rook-endings',
  kingdom: 'endgames',
  title: 'Rook Endings: Lucena and Philidor',
  topics: ['Rook endings', 'Lucena', 'Philidor', 'Rook activity', 'Theoretical draws'],
  summary: 'The two positions every player must know — how to win with the extra pawn, and how to hold without it.',
  intro: 'Rook endings are the most common endings in practice. Two classic positions explain most of them: the Lucena position (how the stronger side wins) and the Philidor position (how the weaker side draws).',
  objectives: ['Build a bridge to win the Lucena position', 'Defend with the rook on the third rank, then from behind', 'Use checks from a distance to hold a draw'],
  concept: [
    'Lucena: the attacking king stands on the promotion square in front of its pawn, the defending king is cut off. The winning method is to “build a bridge”: bring the rook to the fourth rank, walk the king out, and block the checks with the rook.',
    'Philidor: the defending king stands in front of the pawn. Keep the rook on your third rank so the enemy king cannot advance. When the pawn steps onto that rank, the king has lost its shelter: drop the rook to your first rank and check from behind.',
    'A rook is strongest when active. Checks from long distance — ideally from behind or from the side, far away — are the defender’s main weapon.',
    'Every position in this lesson was certified by Stockfish 16 (NNUE). That is very strong evidence, but an engine judgement rather than a mathematical proof.',
  ],
  demo: {
    fen: '1K6/1P2k3/8/8/8/8/r7/3R4 w - - 0 1',
    moves: ['Rd4', 'Ra1', 'Kc7', 'Rc1+', 'Kb6', 'Rb1+', 'Kc6', 'Rc1+', 'Kb5', 'Rb1+', 'Rb4'],
    captions: [
      'The Lucena position. White’s king is in front of the pawn; Black’s king is cut off on the e-file by the rook.',
      '1.Rd4! — the rook goes to the fourth rank to prepare the “bridge”.',
      'Black waits.',
      '2.Kc7 — the king comes out.',
      '…Rc1+ — the checks begin.',
      '3.Kb6',
      '…Rb1+',
      '4.Kc6',
      '…Rc1+',
      '5.Kb5 — approaching the rook.',
      '…Rb1+',
      '6.Rb4 — the bridge: the rook blocks the check, and the pawn will promote.',
    ],
    verify: { mode: 'win', depth: 18 },
  },
  guided: [
    { kind: 'puzzle', id: 'e-rook.g1', fen: '4k3/R7/1r2P3/5K2/8/8/8/8 b - - 0 1', orientation: 'black', solution: ['Rb1'], accept: ['Rb2', 'Rb3', 'Rb4'], goal: { type: 'engine', mode: 'draw', margin: 2, depth: 20 }, prompt: 'Black to move and draw. White’s pawn has just reached the sixth rank.', explanation: 'Drop the rook down the b-file (…Rb1, …Rb2, …Rb3 or …Rb4) and check the white king from behind; it has no shelter now. King moves lose.', hints: ['The pawn now blocks the white king’s shelter.', 'Get ready to give checks from behind.'], difficulty: 3, objective: 'Defend with the rook on the third rank, then from behind', themes: ['philidor', 'rook endings'] },
    { kind: 'choice', id: 'e-rook.g2', prompt: 'In the Philidor defence, where should the defending rook stand while the attacking pawn is still on its fifth rank?', options: ['On its own third rank (the sixth rank for Black)', 'Next to its own king', 'Behind the pawn immediately', 'On the first rank'], answer: 0, explanation: 'On the third rank it keeps the enemy king from advancing; only when the pawn arrives there does the rook go behind.', hints: [], difficulty: 2, objective: 'Defend with the rook on the third rank, then from behind', themes: ['philidor'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'e-rook.i1', fen: '4k3/1R6/6r1/4KP2/8/8/8/8 b - - 0 1', orientation: 'black', solution: ['Rc6'], accept: ['Ra6', 'Rh6'], goal: { type: 'engine', mode: 'draw', margin: 2, depth: 20 }, prompt: 'Black to move and draw.', explanation: 'Keep the rook on the sixth rank (…Rc6, …Ra6 or …Rh6). Leaving it lets the white king advance; Stockfish rates every other move as lost.', hints: ['Which rank must the rook guard?'], difficulty: 3, objective: 'Defend with the rook on the third rank, then from behind', themes: ['philidor', 'rook endings'] },
    { kind: 'puzzle', id: 'e-rook.i2', fen: '4k3/R5K1/5P2/8/8/8/3r4/8 b - - 0 1', orientation: 'black', solution: ['Rg2+'], goal: { type: 'engine', mode: 'draw', margin: 2, depth: 20 }, prompt: 'Black to move and draw.', explanation: '…Rg2+ — the check from behind. Every other move loses.', hints: ['Checks from long distance are the defender’s weapon.'], difficulty: 3, objective: 'Use checks from a distance to hold a draw', themes: ['rook endings', 'checks from behind'] },
  ],
  application: [
    { kind: 'puzzle', id: 'e-rook.a1', fen: '4k3/8/3PK2R/6r1/8/8/8/8 b - - 0 1', orientation: 'black', solution: ['Rg8'], goal: { type: 'engine', mode: 'draw', margin: 2, depth: 20 }, prompt: 'Black to move and draw.', explanation: '…Rg8 — back to the back rank, covering the king from the side. It is the only move that holds; every check here loses.', hints: ['Not every rook move should be a check.'], difficulty: 4, objective: 'Use checks from a distance to hold a draw', themes: ['rook endings', 'defence'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'e-rook.e1', fen: '2k5/8/1KP5/8/7R/8/8/2r5 b - - 0 1', orientation: 'black', solution: ['Rb1+'], goal: { type: 'engine', mode: 'draw', margin: 2, depth: 20 }, prompt: 'Black to move and draw.', explanation: '…Rb1+ — a check from the side drives the king away. Every other move loses.', hints: [], difficulty: 3, objective: 'Use checks from a distance to hold a draw', themes: ['rook endings'] },
    { kind: 'puzzle', id: 'e-rook.e2', fen: '3rk3/2K5/3P4/8/8/8/2R5/8 b - - 0 1', orientation: 'black', solution: ['Rd7+'], goal: { type: 'engine', mode: 'draw', margin: 2, depth: 20 }, prompt: 'Black to move and draw.', explanation: '…Rd7+ — the only move that holds.', hints: [], difficulty: 3, objective: 'Use checks from a distance to hold a draw', themes: ['rook endings'] },
    { kind: 'choice', id: 'e-rook.e3', prompt: 'In the Lucena position, what does “building a bridge” mean?', options: ['Bringing the rook to the fourth rank so it can later block the checks', 'Trading rooks', 'Pushing the pawn immediately', 'Cutting off your own king'], answer: 0, explanation: 'The rook on the fourth rank shields the king from checks once it walks out.', hints: [], difficulty: 2, objective: 'Build a bridge to win the Lucena position', themes: ['lucena'] },
  ],
  prerequisites: ['e-distant-opposition'],
  attribution: ENGINE,
};

export const ENDGAME_LESSONS = [opposition, keySquares, distant, rookEndings];

export const ENDGAME_BOSS: Task[] = [
  { kind: 'puzzle', id: 'e-boss.1', fen: '8/8/8/4k3/8/8/4PK2/8 w - - 0 1', solution: ['Ke3'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'Ke3 takes the opposition in front of the pawn.', hints: [], difficulty: 2, objective: 'Take the opposition to win', themes: ['opposition'] },
  { kind: 'puzzle', id: 'e-boss.2', fen: '8/8/8/2k5/8/2PK4/8/8 b - - 0 1', orientation: 'black', solution: ['Kd5'], goal: { type: 'kpk', outcome: 'draw' }, prompt: 'Black to move and draw.', explanation: '…Kd5 takes the opposition.', hints: [], difficulty: 3, objective: 'Take the opposition to defend', themes: ['opposition', 'defence'] },
  { kind: 'puzzle', id: 'e-boss.3', fen: '8/8/8/8/1P4k1/8/8/7K w - - 0 1', solution: ['b5'], goal: { type: 'kpk', outcome: 'win' }, prompt: 'White to move and win.', explanation: 'b5 — the black king on g4 is outside the square b5–b8–e8–e5.', hints: [], difficulty: 2, objective: 'Use the rule of the square', themes: ['rule of the square'] },
  { kind: 'choice', id: 'e-boss.4', prompt: 'You have king and pawn against king and it is your move. When is pushing the pawn usually wrong?', options: ['When your king is already in front of it on a key square', 'When the push lets the defending king get in front of the pawn', 'Never', 'Always'], answer: 1, explanation: 'Lead with the king; push only when the defender cannot then occupy the squares in front of the pawn.', hints: [], difficulty: 2, objective: 'Avoid pushing the pawn too early', themes: ['key squares'] },
];

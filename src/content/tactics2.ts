// Tactical Kingdom, part 2. Positions were found with scripts/mine-positions.ts or composed
// by hand, and every one is re-verified by scripts/validate-content.ts.
import { ORIGINAL, type Lesson } from './schema.ts';

const MINED = { source: 'Chessverse Academy original exercise', note: 'Found by the academy position miner and verified by exhaustive mate search.' };

const decoy: Lesson = {
  id: 't-decoy',
  kingdom: 'tactics',
  title: 'Deflection, Decoy and Attraction',
  topics: ['Deflection', 'Decoy', 'Attraction'],
  summary: 'Drag a piece onto a fatal square — or lure a defender away from its duty.',
  intro: 'Many combinations start with a sacrifice whose only purpose is to move an enemy piece: away from what it defends, or onto a square where it is in the way.',
  objectives: ['Recognise an overloaded defender', 'Use a sacrifice to drag a piece onto a bad square', 'Attract the king into a mating net'],
  concept: [
    'Deflection: force a defending piece away from its duty — a back-rank square, a mating square, another piece — usually by offering it something it must take.',
    'Decoy: force an enemy piece onto a particular square, where it blocks its own king or becomes a target.',
    'Attraction: a decoy aimed at the king itself, dragging it into a mating net or a fork.',
    'The test: ask what each enemy piece is defending. A piece with two jobs is overloaded, and a single forcing move can break it.',
  ],
  demo: {
    fen: '5r1k/4N1pp/8/7Q/8/4R3/5PPP/6K1 w - - 0 1',
    moves: ['Qxh7+', 'Kxh7', 'Rh3#'],
    captions: [
      'The knight on e7 covers g8 and g6. Black’s king looks safe on h8.',
      '1.Qxh7+!! — the queen is offered to attract the king to h7.',
      'Black has no choice: the king must capture.',
      '2.Rh3# — Anastasia’s mate. The knight covers g6 and g8, and the g7-pawn blocks the king.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-decoy.g1', fen: '3r2k1/5ppp/8/1Q6/8/8/5PPP/4R1K1 w - - 0 1', solution: ['Re8+', 'Rxe8', 'Qxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two: the rook on d8 has too much to do.', explanation: '1.Re8+ Rxe8 2.Qxe8# (1.Qe8+ Rxe8 2.Rxe8# also works). The d8-rook is the only guard of the back rank, so either sacrifice deflects it.', hints: ['Count attackers and defenders of e8.', 'Give check on e8 and let the rook take.'], difficulty: 2, objective: 'Recognise an overloaded defender', themes: ['deflection', 'back rank', 'mate in 2'] },
    { kind: 'choice', id: 't-decoy.g2', prompt: 'What is the difference between deflection and decoy?', options: ['Deflection pulls a defender away from a square; decoy drags a piece onto a square', 'They are two names for a fork', 'Deflection uses only pawns', 'A decoy never involves a sacrifice'], answer: 0, explanation: 'Deflection is about where the piece leaves; decoy (or attraction, for the king) is about where it is forced to go.', hints: [], difficulty: 1, objective: 'Recognise an overloaded defender', themes: ['deflection', 'decoy'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-decoy.i1', fen: '2q3kb/pp3ppp/5pp1/6r1/3QR3/3R4/1P4PP/6K1 w - - 0 1', solution: ['Qd8+', 'Qxd8', 'Rxd8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qd8+!! Qxd8 2.Rxd8#. The queen sacrifice decoys Black’s queen onto d8, and the rook on d3 recaptures with mate on the back rank.', hints: ['Your queen and a rook are lined up on the d-file.', 'Which back-rank square can you attack twice?'], difficulty: 3, objective: 'Use a sacrifice to drag a piece onto a bad square', themes: ['decoy', 'back rank', 'mate in 2'] },
    { kind: 'puzzle', id: 't-decoy.i2', fen: '6k1/3q1ppp/4Q1p1/rR6/8/8/1P5P/7K w - - 0 1', solution: ['Rb8+', 'Qc8', 'Rxc8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rb8+ forces the black queen to block on c8, d8 or e8, and wherever she blocks she is captured with mate.', hints: ['Start with a check on the back rank.'], difficulty: 2, objective: 'Recognise an overloaded defender', themes: ['deflection', 'back rank', 'mate in 2'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-decoy.a1', fen: '1n3k2/ppNRrpp1/5p2/8/8/8/P4P1P/6K1 w - - 0 1', solution: ['Rd8+', 'Re8', 'Rxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rd8+ Re8 is forced, and the rook that blocked is now a target: 2.Rxe8#.', hints: ['A back-rank check forces a block.', 'Can the blocking piece be captured with mate?'], difficulty: 2, objective: 'Use a sacrifice to drag a piece onto a bad square', themes: ['decoy', 'back rank', 'mate in 2'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-decoy.e1', fen: '6k1/p5pp/1R3p2/5bN1/1N6/8/P6P/7K w - - 0 1', solution: ['Rb8+', 'Bc8', 'Rxc8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rb8+ Bc8 2.Rxc8#. The bishop is forced back to block, and the block falls with mate.', hints: [], difficulty: 2, objective: 'Recognise an overloaded defender', themes: ['back rank', 'mate in 2'] },
    { kind: 'puzzle', id: 't-decoy.e2', fen: '5k2/5ppp/4bB2/8/1R6/8/PP6/2K5 w - - 0 1', solution: ['Rb8+', 'Bc8', 'Rxc8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rb8+ Bc8 2.Rxc8#. The bishop on f6 takes away g7, so the king has no escape.', hints: [], difficulty: 2, objective: 'Use a sacrifice to drag a piece onto a bad square', themes: ['back rank', 'mate in 2'] },
    { kind: 'choice', id: 't-decoy.e3', prompt: 'A black rook is the only guard of the back rank and also protects a knight. What is that rook?', options: ['Pinned', 'Overloaded', 'Trapped', 'Promoted'], answer: 1, explanation: 'A piece with two defensive jobs is overloaded: force it to do one and the other collapses.', hints: [], difficulty: 1, objective: 'Recognise an overloaded defender', themes: ['overloading'] },
  ],
  prerequisites: ['t-mating-patterns'],
  attribution: MINED,
};

const defender: Lesson = {
  id: 't-defender',
  kingdom: 'tactics',
  title: 'Removing the Defender',
  topics: ['Removing the defender', 'Hanging pieces'],
  summary: 'If one piece holds the position together, capture it.',
  intro: 'Before you look for a combination, find the pieces that keep the opponent alive. Remove one — by capture or exchange — and something falls.',
  objectives: ['Identify the key defender', 'Capture or exchange the defender', 'Follow up before the opponent recovers'],
  concept: [
    'List what each defending piece protects: mating squares, other pieces, key entry squares.',
    'If one piece guards something essential, attack it — capture it outright, or exchange it off.',
    'The follow-up must come at once: removing the defender is only half the combination.',
  ],
  demo: {
    fen: '6k1/1p1R3p/5p2/2q1R3/8/7B/PP3P2/6K1 w - - 0 1',
    moves: ['Rxc5', 'Kh8', 'Rc8#'],
    captions: [
      'Black’s queen guards c8 — and with it the back rank.',
      '1.Rxc5! removes the defender (and wins the queen).',
      'Black has nothing left to stop the rook.',
      '2.Rc8# — the rook on d7 covers the seventh rank.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-def.g1', fen: '2r4k/pp2r1pp/5p1p/8/Q1R5/5N2/1P4PP/6K1 w - - 0 1', solution: ['Rxc8+', 'Re8', 'Rxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxc8+ removes the rook that guarded the back rank. The only block, …Re8, is captured with mate: 2.Rxe8# (or 2.Qxe8#).', hints: ['Which black piece guards the back rank?'], difficulty: 2, objective: 'Capture or exchange the defender', themes: ['removing the defender', 'back rank', 'mate in 2'] },
    { kind: 'choice', id: 't-def.g2', prompt: 'You want to mate on h7, but a black knight on f6 defends h7. What does “removing the defender” suggest?', options: ['Capture or exchange the knight on f6', 'Move your king', 'Push a queenside pawn', 'Offer a draw'], answer: 0, explanation: 'Take away the piece that protects the target square, then strike.', hints: [], difficulty: 1, objective: 'Identify the key defender', themes: ['removing the defender'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-def.i1', fen: '1R4rk/1p2R1pp/r5pp/8/6Q1/8/5PP1/7K w - - 0 1', solution: ['Rxg8+', 'Kxg8', 'Qc8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxg8+! Kxg8 2.Qc8#. The black rook was the only guard of the back rank; with it gone, the queen mates — the rook on e7 covers f7.', hints: ['Which piece stands between you and the back rank?'], difficulty: 3, objective: 'Capture or exchange the defender', themes: ['removing the defender', 'back rank', 'mate in 2'] },
    { kind: 'puzzle', id: 't-def.i2', fen: '5kB1/pr3ppp/1R4p1/8/4R3/8/P5P1/7K w - - 0 1', solution: ['Rxb7', 'Kxg8', 'Rb8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxb7! removes the rook that guarded b8. Black cannot cover the back rank in time: 2.Rb8# follows (after …Kxg8, 2.Re8# also mates).', hints: ['Find the black piece that guards the back rank.'], difficulty: 3, objective: 'Identify the key defender', themes: ['removing the defender', 'back rank', 'mate in 2'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-def.a1', fen: '4r1k1/ppQ2pp1/b3Rpp1/2B5/8/8/1P6/6K1 w - - 0 1', solution: ['Rxe8+', 'Kh7', 'Qh2#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxe8+ captures the defender of the back rank. After 1…Kh7 the queen swings over: 2.Qh2#.', hints: ['Remove the rook first.', 'Where does the king run, and which diagonal reaches it?'], difficulty: 3, objective: 'Follow up before the opponent recovers', themes: ['removing the defender', 'mate in 2'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-def.e1', fen: 'n4k2/1pq2rpp/Q1N4p/7R/8/8/P5PP/6K1 w - - 0 1', solution: ['Qxa8+', 'Qb8', 'Qxb8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxa8+ removes the knight; the queen can block on b8, c8 or d8, and is captured with mate wherever she goes.', hints: [], difficulty: 2, objective: 'Capture or exchange the defender', themes: ['removing the defender', 'mate in 2'] },
    { kind: 'puzzle', id: 't-def.e2', fen: '2r4k/5ppp/8/8/8/8/2R2PPP/2R3K1 w - - 0 1', solution: ['Rxc8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Finish the game.', explanation: 'Rxc8# — the doubled rooks remove the lone defender of the back rank with mate.', hints: [], difficulty: 1, objective: 'Capture or exchange the defender', themes: ['removing the defender', 'back rank'] },
  ],
  prerequisites: ['t-decoy'],
  attribution: MINED,
};

const lines: Lesson = {
  id: 't-lines',
  kingdom: 'tactics',
  title: 'Clearance, X-ray and Interference',
  topics: ['Clearance', 'X-ray attacks', 'Interference'],
  summary: 'Open your own lines, attack through pieces, and cut the opponent’s lines.',
  intro: 'Line pieces win games along files, ranks and diagonals. These three ideas are about who controls those lines.',
  objectives: ['Clear a line with tempo', 'Use a battery to attack through a piece (x-ray)', 'Recognise interference'],
  concept: [
    'Clearance: one of your own pieces stands in the way. Move it off the line — ideally with a threat or check — so the piece behind can strike.',
    'X-ray: a line piece attacks through another piece. Doubled rooks, or a queen in front of a rook, attack a square twice even though only the front piece “sees” it.',
    'Interference: place a piece on the line between an enemy defender and what it defends, cutting the connection.',
  ],
  demo: {
    fen: '3qr1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
    moves: ['Qxe8+', 'Qxe8', 'Rxe8#'],
    captions: [
      'White’s queen and rook form a battery on the e-file. The rook “sees” e8 through its own queen: an x-ray.',
      '1.Qxe8+ — White attacks e8 twice, Black defends it only once.',
      'Black recaptures with the queen.',
      '2.Rxe8# — the rook behind the queen finishes the job.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-lines.g1', fen: '3qr1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', solution: ['Qxe8+', 'Qxe8', 'Rxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two using the battery.', explanation: '1.Qxe8+ Qxe8 2.Rxe8#. The rook behind the queen “x-rays” e8, so White attacks it twice and Black defends it only once.', hints: ['Count attackers of e8, including the rook behind the queen.'], difficulty: 2, objective: 'Use a battery to attack through a piece (x-ray)', themes: ['x-ray', 'back rank', 'mate in 2'] },
    { kind: 'choice', id: 't-lines.g2', prompt: 'A black rook on a8 guards e8. White plays a knight to c8, between them. What is this idea called?', options: ['Clearance', 'Interference', 'Zugzwang', 'Castling'], answer: 1, explanation: 'Blocking the line between a defender and what it defends is interference.', hints: [], difficulty: 1, objective: 'Recognise interference', themes: ['interference'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-lines.i1', fen: '5rk1/5ppp/8/7N/8/3B3Q/5PPP/6K1 w - - 0 1', solution: ['Nf6+', 'gxf6', 'Qxh7#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Nf6+! clears the h-file with check; whatever Black does, 2.Qxh7# follows, protected by the bishop.', hints: ['Your queen is blocked by your own piece.', 'Move it away with check.'], difficulty: 3, objective: 'Clear a line with tempo', themes: ['clearance', 'mate in 2'] },
    { kind: 'puzzle', id: 't-lines.i2', fen: '6k1/2n1Qppp/6pp/2N4r/8/8/P4P1P/6K1 w - - 0 1', solution: ['Qd8+', 'Ne8', 'Qxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qd8+ Ne8 2.Qxe8#. The knight must interfere on e8, and it falls there.', hints: ['Check on the back rank.'], difficulty: 2, objective: 'Recognise interference', themes: ['interference', 'back rank', 'mate in 2'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-lines.a1', fen: '5k2/1pR2ppp/6p1/3r1r2/4R3/6B1/5P1P/6K1 w - - 0 1', solution: ['Rc8+', 'Rd8', 'Rxd8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rc8+ Rd8 2.Rxd8#. Only the d5-rook can block the check, and the blocker is captured with mate.', hints: ['Which squares around the king do your pieces already control?'], difficulty: 3, objective: 'Recognise interference', themes: ['back rank', 'mate in 2'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-lines.e1', fen: '6k1/pp3pp1/2q1bQpR/4Rr2/8/8/P5PP/6K1 w - - 0 1', solution: ['Qd8+', 'Qe8', 'Qxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qd8+ Qe8 is the only defence, and the blocking queen is captured with mate: 2.Qxe8#.', hints: [], difficulty: 3, objective: 'Recognise interference', themes: ['back rank', 'mate in 2'] },
    { kind: 'puzzle', id: 't-lines.e2', fen: '7k/p1B2p1p/1Q3qR1/4b3/8/8/1P4PP/2K5 w - - 0 1', solution: ['Qb8+', 'Qd8', 'Qxd8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qb8+ Qd8 2.Qxd8#. Black can only block on d8, and the bishop on c7 guards that square, so the queen captures with mate.', hints: [], difficulty: 2, objective: 'Recognise interference', themes: ['back rank', 'mate in 2'] },
  ],
  prerequisites: ['t-skewers'],
  attribution: ORIGINAL,
};

export const TACTICS2_LESSONS = [decoy, defender, lines];

import { ORIGINAL, type Lesson, type Task } from './schema.ts';

const forks: Lesson = {
  id: 't-forks',
  kingdom: 'tactics',
  title: 'Forks',
  topics: ['Forks', 'Knight forks', 'Hanging pieces'],
  summary: 'One piece, two targets: the opponent can only save one.',
  intro: 'A fork is a single move that attacks two or more enemy pieces at once. The most powerful forks include the king, because check must be answered first.',
  objectives: ['Recognise fork geometry for every piece', 'Find knight forks that include the king', 'Use pawn forks against two pieces'],
  concept: [
    'Look for enemy pieces that are undefended or more valuable than your attacker, and ask: is there one square from which I can hit two of them?',
    'Knights fork best because their attack cannot be blocked and they often attack pieces that cannot attack back.',
    'A fork with check (a “royal fork” when it hits king and queen) is decisive: the king must move, and the second piece falls.',
    'Pawns fork too: a pawn attacking two pieces wins one of them, since both are worth more than the pawn.',
  ],
  demo: {
    fen: 'r3k3/7p/8/1N6/8/8/7P/4K3 w - - 0 1',
    moves: ['Nc7+', 'Kd7', 'Nxa8'],
    captions: [
      'The knight on b5 eyes c7 — a square that touches both e8 and a8.',
      'Nc7+ forks the king and the rook.',
      'The king must move.',
      'Nxa8 collects the rook.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-forks.g1', fen: 'r3k3/7p/8/1N6/8/8/7P/4K3 w - - 0 1', solution: ['Nc7+', 'Kd7', 'Nxa8'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move. Fork the king and rook.', explanation: 'Nc7+ attacks e8 and a8 together; after the king moves, Nxa8.', hints: ['Which square is a knight’s jump from both e8 and a8?'], difficulty: 1, objective: 'Find knight forks that include the king', themes: ['fork', 'knight fork'] },
    { kind: 'puzzle', id: 't-forks.g2', fen: '4k3/8/2n1n3/8/3P4/8/8/4K3 w - - 0 1', solution: ['d5'], goal: { type: 'material', minGain: 2, depth: 3 }, prompt: 'White to move. Use the pawn to fork two knights.', explanation: 'd5 attacks c6 and e6. Only one knight can escape, so White wins a knight (3) for at most the pawn (1).', hints: ['Pawns capture diagonally — which advance attacks both?'], difficulty: 1, objective: 'Use pawn forks against two pieces', themes: ['fork', 'pawn fork'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-forks.i1', fen: '6k1/3q1p1p/8/8/4N3/8/5PPP/6K1 w - - 0 1', solution: ['Nf6+'], goal: { type: 'material', minGain: 6, depth: 3 }, prompt: 'White to move. Win the queen.', explanation: 'Nf6+ forks the king on g8 and the queen on d7. With no g7-pawn, nothing can capture the knight.', hints: ['Look for a knight check.', 'Which knight check also touches d7?'], difficulty: 2, objective: 'Find knight forks that include the king', themes: ['fork', 'knight fork', 'royal fork'] },
    { kind: 'puzzle', id: 't-forks.i2', fen: 'r5k1/6pp/8/8/8/8/6PP/3Q2K1 w - - 0 1', solution: ['Qd5+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move. The queen can fork too.', explanation: 'Qd5+ checks along the a2–g8 diagonal and attacks the rook on a8 along the other diagonal.', hints: ['Find a central square on two open diagonals.'], difficulty: 2, objective: 'Recognise fork geometry for every piece', themes: ['fork', 'queen fork'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-forks.a1', fen: '2r3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', solution: ['Ne7+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move. Find the tactic.', explanation: 'Ne7+ forks g8 and c8. After the king steps aside, Nxc8.', hints: ['Knight checks first.'], difficulty: 2, objective: 'Find knight forks that include the king', themes: ['fork', 'knight fork'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-forks.e1', fen: 'r7/6pk/8/8/8/8/5PPP/4Q1K1 w - - 0 1', solution: ['Qe4+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Qe4+ hits the king on h7 and the rook on a8 at once. After …g6 or a king move, Qxa8.', hints: [], difficulty: 2, objective: 'Recognise fork geometry for every piece', themes: ['fork', 'queen fork'] },
    { kind: 'puzzle', id: 't-forks.e2', fen: '8/2r3kp/8/8/3N4/8/7P/6K1 w - - 0 1', solution: ['Ne6+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Ne6+ forks the king on g7 and the rook on c7.', hints: [], difficulty: 2, objective: 'Find knight forks that include the king', themes: ['fork', 'knight fork'] },
  ],
  prerequisites: ['f-material'],
  attribution: ORIGINAL,
};

const pins: Lesson = {
  id: 't-pins',
  kingdom: 'tactics',
  title: 'Pins',
  topics: ['Pins'],
  summary: 'Freeze a piece in front of something more valuable — then attack it.',
  intro: 'A pin attacks a piece that cannot (or should not) move because a more valuable piece stands behind it on the same line.',
  objectives: ['Tell absolute and relative pins apart', 'Create a pin with a rook or bishop', 'Exploit a pinned piece by attacking it again'],
  concept: [
    'Only line pieces — bishops, rooks and queens — can pin.',
    'Absolute pin: the piece behind is the king, so moving the pinned piece is illegal. Relative pin: the piece behind is merely valuable (often the queen), so moving is legal but costly.',
    'A pinned piece is a frozen target: attack it again (often with a pawn) and it usually falls.',
    'Even a queen can be pinned to her king; she may capture the pinner only if it stands on the pin line and is undefended.',
  ],
  demo: {
    fen: '4k3/1p6/2n5/1B6/3P4/8/8/4K3 w - - 0 1',
    moves: ['d5', 'Kd7', 'dxc6+', 'bxc6'],
    captions: [
      'The bishop on b5 pins the knight on c6 to the king on e8.',
      'd5! attacks the pinned knight. It cannot move.',
      'Black brings the king over to defend, but the knight is still attacked by a mere pawn.',
      'dxc6+ — pawn takes knight, with check.',
      'Black recaptures with a pawn: White has won a knight for a pawn.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-pins.g1', fen: '4k3/1p6/2n5/1B6/3P4/8/8/4K3 w - - 0 1', solution: ['d5'], goal: { type: 'material', minGain: 2, depth: 3 }, prompt: 'White to move. The knight is pinned. Attack it.', explanation: 'd5 attacks the pinned knight; it cannot run, so White wins it for a pawn. (Bxc6+ bxc6 would only trade bishop for knight.)', hints: ['What is cheaper than a knight and can attack c6?'], difficulty: 1, objective: 'Exploit a pinned piece by attacking it again', themes: ['pin', 'absolute pin'] },
    { kind: 'choice', id: 't-pins.g2', prompt: 'Which pieces can create a pin?', options: ['Knights and pawns', 'Bishops, rooks and queens', 'Only the queen', 'Any piece'], answer: 1, explanation: 'A pin needs a line through the pinned piece to the piece behind it: only line pieces can do that.', hints: [], difficulty: 1, objective: 'Tell absolute and relative pins apart', themes: ['pin'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-pins.i1', fen: '4k3/8/8/4q3/8/8/5K2/R7 w - - 0 1', solution: ['Re1'], goal: { type: 'material', minGain: 4, depth: 3 }, prompt: 'White to move. Pin the queen.', explanation: 'Re1 pins the queen to the king. …Qxe1+ Kxe1 gives Black only a rook for the queen; anything else and Rxe5.', hints: ['The queen and king share a file.', 'Make sure your pinning rook is protected.'], difficulty: 2, objective: 'Create a pin with a rook or bishop', themes: ['pin', 'absolute pin'] },
    { kind: 'puzzle', id: 't-pins.i2', fen: '4k3/3r4/8/8/8/8/8/5BK1 w - - 0 1', solution: ['Bb5'], goal: { type: 'material', minGain: 2, depth: 3 }, prompt: 'White to move. Win the exchange with a pin.', explanation: 'Bb5 pins the rook to the king. The rook cannot escape, so White gets rook for bishop at least.', hints: ['Rook and king share a diagonal.'], difficulty: 2, objective: 'Create a pin with a rook or bishop', themes: ['pin', 'absolute pin'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-pins.a1', fen: '7k/5p1p/5qp1/8/8/8/5PPP/1RB3K1 w - - 0 1', solution: ['Bb2'], goal: { type: 'material', minGain: 6, depth: 3 }, prompt: 'White to move. Win the queen.', explanation: 'Bb2 pins the queen to the king along the long diagonal. …Qxb2 Rxb2 is the best Black can do.', hints: ['Queen and king share the long diagonal.', 'The rook on b1 protects b2.'], difficulty: 3, objective: 'Create a pin with a rook or bishop', themes: ['pin', 'absolute pin'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-pins.e1', fen: '3k4/8/8/3q4/8/8/2K5/R7 w - - 0 1', solution: ['Rd1'], goal: { type: 'material', minGain: 4, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Rd1 pins the queen to the king; the king on c2 protects the rook.', hints: [], difficulty: 2, objective: 'Create a pin with a rook or bishop', themes: ['pin'] },
    { kind: 'choice', id: 't-pins.e2', prompt: 'A knight is pinned to its queen (not its king). Can it legally move?', options: ['No, never', 'Yes — it is a relative pin, but the queen may be lost', 'Only to capture', 'Only if it gives check'], answer: 1, explanation: 'Only pins to the king are absolute.', hints: [], difficulty: 2, objective: 'Tell absolute and relative pins apart', themes: ['pin', 'relative pin'] },
  ],
  prerequisites: ['f-material'],
  attribution: ORIGINAL,
};

const skewers: Lesson = {
  id: 't-skewers',
  kingdom: 'tactics',
  title: 'Skewers',
  topics: ['Skewers', 'X-ray attacks'],
  summary: 'A pin in reverse: attack the big piece, take the one behind it.',
  intro: 'In a skewer the more valuable piece is in front. When it moves out of the attack, the piece behind it is captured.',
  objectives: ['Spot pieces lined up behind the king or queen', 'Deliver skewers with rooks and bishops'],
  concept: [
    'Look for an enemy king or queen on the same line as another undefended piece.',
    'Check the king along that line; when it steps aside, the piece behind is exposed. This is also called an x-ray attack.',
    'Make sure the checking piece cannot simply be captured by the king.',
  ],
  demo: {
    fen: '8/8/2k4r/8/8/8/8/R5K1 w - - 0 1',
    moves: ['Ra6+', 'Kb7', 'Rxh6'],
    captions: ['King and rook stand on the same rank.', 'Ra6+ checks the king along the 6th rank.', 'The king must leave the rank.', 'Rxh6 — the rook behind it falls.'],
  },
  guided: [
    { kind: 'puzzle', id: 't-skewers.g1', fen: '8/8/2k4r/8/8/8/8/R5K1 w - - 0 1', solution: ['Ra6+', 'Kb7', 'Rxh6'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move. Skewer king and rook.', explanation: 'Ra6+ and Rxh6.', hints: ['King and rook share the 6th rank.'], difficulty: 1, objective: 'Deliver skewers with rooks and bishops', themes: ['skewer'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-skewers.i1', fen: '6q1/p7/8/3k4/8/8/P6K/3B4 w - - 0 1', solution: ['Bb3+'], goal: { type: 'material', minGain: 9, depth: 3 }, prompt: 'White to move. Win the queen.', explanation: 'Bb3+ checks along the a2–g8 diagonal; once the king moves, Bxg8.', hints: ['King and queen share a diagonal.'], difficulty: 2, objective: 'Deliver skewers with rooks and bishops', themes: ['skewer'] },
    { kind: 'puzzle', id: 't-skewers.i2', fen: '4r3/8/8/8/4k3/8/8/R5K1 w - - 0 1', solution: ['Re1+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Re1+ checks up the e-file; the rook on e8 is behind the king.', hints: ['Look along the e-file.'], difficulty: 2, objective: 'Spot pieces lined up behind the king', themes: ['skewer'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-skewers.a1', fen: '2r5/p7/8/5k2/8/8/P7/5BK1 w - - 0 1', solution: ['Bh3+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Bh3+ checks on the h3–c8 diagonal; the rook on c8 stands behind the king.', hints: ['Which diagonal holds both the king and the rook?'], difficulty: 2, objective: 'Spot pieces lined up behind the king', themes: ['skewer'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-skewers.e1', fen: '8/8/8/8/3k3r/8/8/R5K1 w - - 0 1', solution: ['Ra4+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Ra4+ skewers the king and the rook on h4.', hints: [], difficulty: 1, objective: 'Deliver skewers with rooks and bishops', themes: ['skewer'] },
    { kind: 'choice', prompt: 'What is the key difference between a pin and a skewer?', id: 't-skewers.e2', options: ['A skewer needs a knight', 'In a skewer the more valuable piece is in front', 'A pin always wins the queen', 'There is no difference'], answer: 1, explanation: 'Pin: valuable piece behind. Skewer: valuable piece in front.', hints: [], difficulty: 1, objective: 'Spot pieces lined up behind the king', themes: ['skewer'] },
  ],
  prerequisites: ['t-pins'],
  attribution: ORIGINAL,
};

const discovered: Lesson = {
  id: 't-discovered',
  kingdom: 'tactics',
  title: 'Discovered Attacks and Double Check',
  topics: ['Discovered attacks', 'Discovered checks', 'Double checks'],
  summary: 'Move one piece to unleash another — two threats in a single move.',
  intro: 'When a piece moves off a line, it can uncover an attack by the piece behind it. Now both pieces threaten something at once.',
  objectives: ['Find discovered checks', 'Use the moving piece to make a second threat', 'Recognise double check, which only a king move can answer'],
  concept: [
    'Set-up: your line piece (rook, bishop, queen) aims at a target, with one of your own pieces in the way.',
    'Move the front piece with a threat of its own. The opponent can rarely answer both threats.',
    'Discovered check is strongest: the check must be answered, so the moving piece can capture almost anything.',
    'Double check — both pieces give check — cannot be blocked or answered by a capture. The king must move, and if it cannot, it is mate.',
  ],
  demo: {
    fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1',
    moves: ['Nd6#'],
    captions: [
      'The knight on e4 blocks the rook’s line to the black king.',
      'Nd6# — double check from the knight and the rook. The king has no square: mate.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-disc.g1', fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1', solution: ['Nd6#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one with a double check.', explanation: 'Nd6# (or Nf6#): the knight checks and the rook checks from e1. Two checks cannot both be blocked or captured, and the king is boxed in by its own pieces.', hints: ['Which knight move also gives check itself?'], difficulty: 2, objective: 'Recognise double check', themes: ['double check', 'mate in 1'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-disc.i1', fen: '1r2k3/1q6/8/8/4B3/8/8/4R1K1 w - - 0 1', solution: ['Bxb7+'], goal: { type: 'material', minGain: 7, depth: 3 }, prompt: 'White to move. The queen is defended by the rook… or is it?', explanation: 'Bxb7+ is a discovered check from the rook on e1. Black must answer the check, so …Rxb7 is impossible this move, and the bishop escapes next turn.', hints: ['Moving the bishop opens the e-file.'], difficulty: 3, objective: 'Find discovered checks', themes: ['discovered check'] },
    { kind: 'puzzle', id: 't-disc.i2', fen: '3q2k1/5ppp/8/8/8/3B4/5PPP/3R2K1 w - - 0 1', solution: ['Bxh7+'], goal: { type: 'material', minGain: 6, depth: 3 }, prompt: 'White to move. Unmask the rook against the queen.', explanation: 'Bxh7+ checks the king and uncovers Rd1 against the queen on d8. After the king deals with the check, Rxd8.', hints: ['A quiet bishop move would let the queen capture on d1.', 'Move the bishop with check.'], difficulty: 3, objective: 'Use the moving piece to make a second threat', themes: ['discovered attack'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-disc.a1', fen: '4k3/8/1q6/8/8/4B3/8/4R1K1 w - - 0 1', solution: ['Bxb6+'], accept: ['Bd4+', 'Bc5+', 'Bf2+'], goal: { type: 'material', minGain: 9, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Bxb6 captures the queen and uncovers check from the rook. Any bishop move along that diagonal also wins her: the check comes first, and the queen is taken next move.', hints: [], difficulty: 1, objective: 'Find discovered checks', themes: ['discovered check'] },
  ],
  exam: [
    { kind: 'choice', id: 't-disc.e1', prompt: 'Your king is in double check. Which response is legal?', options: ['Capture one of the checking pieces with another piece', 'Block one check', 'Move the king', 'Any of these'], answer: 2, explanation: 'Only a king move can answer two checks at once.', hints: [], difficulty: 1, objective: 'Recognise double check', themes: ['double check'] },
    { kind: 'puzzle', id: 't-disc.e2', fen: '2q1k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1', solution: ['Nd6+'], goal: { type: 'material', minGain: 6, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Nd6++ is a double check (knight and rook). The king must move, and then Nxc8.', hints: [], difficulty: 3, objective: 'Use the moving piece to make a second threat', themes: ['double check', 'fork'] },
  ],
  prerequisites: ['t-forks'],
  attribution: ORIGINAL,
};

const mates: Lesson = {
  id: 't-mating-patterns',
  kingdom: 'tactics',
  title: 'Mating Patterns',
  topics: ['Mating patterns', 'Deflection', 'Decoy'],
  summary: 'Back rank, smothered mate and the sacrifices that set them up.',
  intro: 'Many mates repeat the same pictures. Learn the picture and you will find the mate in seconds.',
  objectives: ['Deliver the back-rank mate', 'Deliver the smothered mate', 'Use a decoy sacrifice to set up mate'],
  concept: [
    'Back-rank mate: a king behind its own unmoved pawns is mated by a rook or queen on the first/last rank.',
    'Smothered mate: a king surrounded by its own pieces is mated by a knight, which cannot be blocked.',
    'Decoy / deflection: sacrifice to drag a defender onto a bad square or away from its duty — e.g. a queen check that forces a rook to block the king’s last escape.',
  ],
  demo: {
    fen: '5r1k/6pp/7N/3Q4/8/8/6PP/6K1 w - - 0 1',
    moves: ['Qg8+', 'Rxg8', 'Nf7#'],
    captions: [
      'The knight on h6 guards g8. The king on h8 is nearly smothered.',
      'Qg8+!! — a queen sacrifice. The king cannot take, because the knight protects g8.',
      'The rook must capture, filling the king’s last square.',
      'Nf7# — smothered mate.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 't-mates.g1', fen: '6rk/6pp/8/6N1/8/8/6PP/6K1 w - - 0 1', solution: ['Nf7#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Smothered mate in one.', explanation: 'Nf7#. The king is walled in by its own rook and pawns.', hints: ['Knight checks cannot be blocked.'], difficulty: 1, objective: 'Deliver the smothered mate', themes: ['smothered mate', 'mate in 1'] },
    { kind: 'puzzle', id: 't-mates.g2', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['Rd8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one.', explanation: 'Rd8# — the back-rank mate.', hints: [], difficulty: 1, objective: 'Deliver the back-rank mate', themes: ['back rank', 'mate in 1'] },
  ],
  independent: [
    { kind: 'puzzle', id: 't-mates.i1', fen: '5r1k/6pp/7N/3Q4/8/8/6PP/6K1 w - - 0 1', solution: ['Qg8+', 'Rxg8', 'Nf7#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qg8+! Rxg8 2.Nf7# — Philidor’s legacy, the smothered mate.', hints: ['Sacrifice to fill the king’s escape square.'], difficulty: 3, objective: 'Use a decoy sacrifice to set up mate', themes: ['smothered mate', 'decoy', 'mate in 2'] },
    { kind: 'puzzle', id: 't-mates.i2', fen: '3qr1k1/5ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1', solution: ['Rxe8+', 'Qxe8', 'Rxe8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Rxe8+ Qxe8 2.Rxe8#. Doubled rooks overload Black’s back-rank defence.', hints: ['Count attackers and defenders of e8.'], difficulty: 2, objective: 'Deliver the back-rank mate', themes: ['back rank', 'mate in 2'] },
  ],
  application: [
    { kind: 'puzzle', id: 't-mates.a1', fen: '6k1/5ppp/8/8/8/8/5PPP/4Q1K1 w - - 0 1', solution: ['Qe8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Finish the game.', explanation: 'Qe8#.', hints: [], difficulty: 1, objective: 'Deliver the back-rank mate', themes: ['back rank'] },
  ],
  exam: [
    { kind: 'puzzle', id: 't-mates.e1', fen: '2r3k1/3q1ppp/8/8/8/8/2Q2PPP/2R3K1 w - - 0 1', solution: ['Qxc8+', 'Qxc8', 'Rxc8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Qxc8+! Qxc8 2.Rxc8#. White attacks c8 twice and Black defends it only once, so the back rank collapses.', hints: [], difficulty: 2, objective: 'Deliver the back-rank mate', themes: ['back rank', 'mate in 2'] },
    { kind: 'choice', id: 't-mates.e2', prompt: 'Which piece delivers a smothered mate?', options: ['Queen', 'Rook', 'Knight', 'Bishop'], answer: 2, explanation: 'Only the knight can check a king that is completely surrounded.', hints: [], difficulty: 1, objective: 'Deliver the smothered mate', themes: ['smothered mate'] },
  ],
  prerequisites: ['t-discovered'],
  attribution: ORIGINAL,
};

export const TACTICS_LESSONS = [forks, pins, skewers, discovered, mates];

export const TACTICS_BOSS: Task[] = [
  { kind: 'puzzle', id: 't-boss.1', fen: 'q3k3/8/8/3N4/8/8/8/4K3 w - - 0 1', solution: ['Nc7+'], goal: { type: 'material', minGain: 6, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Nc7+ forks the king and the queen on a8.', hints: [], difficulty: 2, objective: 'Find knight forks that include the king', themes: ['fork'] },
  { kind: 'puzzle', id: 't-boss.2', fen: '4k3/8/8/4b3/8/8/6K1/R7 w - - 0 1', solution: ['Re1'], goal: { type: 'material', minGain: 3, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Re1 pins the bishop to the king; it is lost.', hints: [], difficulty: 2, objective: 'Create a pin', themes: ['pin'] },
  { kind: 'puzzle', id: 't-boss.3', fen: '4k3/8/1b1n4/8/2PP4/8/8/6K1 w - - 0 1', solution: ['c5'], goal: { type: 'material', minGain: 2, depth: 3 }, prompt: 'White to move and win material.', explanation: 'c5 forks the bishop and the knight, and the d4-pawn protects it: …Bxc5 dxc5 still leaves the knight attacked.', hints: [], difficulty: 2, objective: 'Use pawn forks', themes: ['fork', 'pawn fork'] },
  { kind: 'puzzle', id: 't-boss.4', fen: '3r3k/6pp/8/8/8/8/6PP/3R1RK1 w - - 0 1', solution: ['Rxd8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Finish it.', explanation: 'Rxd8# — the rook captures with check along the back rank, and the pawns on g7 and h7 trap their own king.', hints: [], difficulty: 1, objective: 'Deliver the back-rank mate', themes: ['back rank'] },
  { kind: 'puzzle', id: 't-boss.5', fen: '8/p5r1/8/8/3k4/8/P7/2B4K w - - 0 1', solution: ['Bb2+'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move and win material.', explanation: 'Bb2+ skewers the king on d4 and the rook on g7 along the long diagonal.', hints: [], difficulty: 2, objective: 'Deliver skewers', themes: ['skewer'] },
];

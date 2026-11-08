import { ORIGINAL, RULES, type Lesson, type Task } from './schema.ts';

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KINGS = '4k3/8/8/8/8/8/8/4K3 w - - 0 1';

const coordinates: Lesson = {
  id: 'f-coordinates',
  kingdom: 'foundation',
  title: 'The Board and Its Coordinates',
  topics: ['Board coordinates', 'Chess notation'],
  summary: 'Name every square instantly — the language every later lesson is written in.',
  intro: 'Every square on the board has a name. Players, books and engines all speak in these names, so learning them first makes everything else faster.',
  objectives: ['Name any square from White’s side of the board', 'Name any square from Black’s side', 'Know where every piece starts'],
  concept: [
    'The board has 8 files (columns) lettered a to h from White’s left to right, and 8 ranks (rows) numbered 1 to 8 from White’s side to Black’s side.',
    'A square’s name is its file letter followed by its rank number: e4 is the e-file, 4th rank.',
    'Set the board so each player has a light square in the right-hand corner (h1 for White, a8 for Black). White’s pieces start on ranks 1 and 2, Black’s on ranks 7 and 8.',
    'When you look from Black’s side, the board is turned around: a8 is in Black’s bottom-right corner, and the files run h to a from left to right.',
  ],
  demo: {
    fen: START,
    moves: ['e4', 'e5', 'Nf3'],
    captions: [
      'The starting position. White’s king stands on e1, Black’s on e8; the queens sit on d1 and d8, on their own colour.',
      'White moves the e-pawn from e2 to e4: the e-file, 4th rank.',
      'Black answers with the pawn from e7 to e5.',
      'The knight on g1 jumps to f3. We write this as Nf3.',
    ],
  },
  guided: [
    { kind: 'square', id: 'f-coord.g1', fen: START, answer: ['e4'], prompt: 'Click the square e4.', explanation: 'e4 is on the e-file (5th column from White’s left) and the 4th rank.', hints: ['Find the e-file first: a, b, c, d, e.', 'Then count up four ranks from White’s side.'], difficulty: 1, objective: 'Name any square from White’s side', themes: ['coordinates'] },
    { kind: 'square', id: 'f-coord.g2', fen: START, answer: ['d1'], prompt: 'Click the square where the white queen starts.', explanation: 'The white queen starts on d1 — “queen on her colour”: a light square for White’s queen.', hints: ['The queen stands next to the king.', 'It is the light square on the d-file.'], difficulty: 1, objective: 'Know where every piece starts', themes: ['coordinates'] },
    { kind: 'choice', id: 'f-coord.g3', prompt: 'Which corner square is light for White when the board is set correctly?', options: ['a1', 'h1', 'Both are light', 'Neither'], answer: 1, explanation: '“Light on the right”: h1 is a light square, a1 is dark.', hints: ['Remember the phrase “light on the right”.'], difficulty: 1, objective: 'Name any square from White’s side', themes: ['coordinates'] },
  ],
  independent: [
    { kind: 'square', id: 'f-coord.i1', fen: START, answer: ['f7'], prompt: 'Click f7 — the square next to Black’s king that only the king defends at the start.', explanation: 'f7 is on the f-file, 7th rank. In the starting position only Black’s king protects it, which is why beginners’ attacks often aim there.', hints: ['The f-file is just right of the e-file from White’s side.'], difficulty: 1, objective: 'Name any square from White’s side', themes: ['coordinates'] },
    { kind: 'square', id: 'f-coord.i2', fen: START, orientation: 'black', answer: ['c6'], prompt: 'The board is now shown from Black’s side. Click c6.', explanation: 'From Black’s side the files run h→a from left to right, and rank 8 is nearest to you. c6 is where Black’s queen-side knight usually develops.', hints: ['From Black’s side, the a-file is on your right.', 'Rank 6 is the third row from Black’s side.'], difficulty: 2, objective: 'Name any square from Black’s side', themes: ['coordinates'] },
    { kind: 'choice', id: 'f-coord.i3', prompt: 'How many squares does a chessboard have, and how many of them are light?', options: ['64 squares, 32 light', '64 squares, 36 light', '81 squares, 40 light', '48 squares, 24 light'], answer: 0, explanation: '8 × 8 = 64 squares, exactly half of them light.', hints: ['8 files times 8 ranks.'], difficulty: 1, objective: 'Name any square from White’s side', themes: ['coordinates'] },
  ],
  application: [
    { kind: 'square', id: 'f-coord.a1', fen: KINGS, answer: ['b5'], prompt: 'Only the kings remain. Without labels to lean on, click b5.', explanation: 'b5: second file, fifth rank.', hints: ['Count from the a-file on White’s left.'], difficulty: 2, objective: 'Name any square from White’s side', themes: ['coordinates'] },
  ],
  exam: [
    { kind: 'square', id: 'f-coord.e1', fen: KINGS, orientation: 'black', answer: ['g3'], prompt: 'Board from Black’s side. Click g3.', explanation: 'From Black’s side g is the second file from your left, and rank 3 is the sixth row from you.', hints: [], difficulty: 2, objective: 'Name any square from Black’s side', themes: ['coordinates'] },
    { kind: 'square', id: 'f-coord.e2', fen: START, answer: ['c8'], prompt: 'Click the starting square of Black’s dark-squared bishop.', explanation: 'Black’s bishops start on c8 and f8; c8 is the dark square.', hints: [], difficulty: 2, objective: 'Know where every piece starts', themes: ['coordinates'] },
    { kind: 'square', id: 'f-coord.e3', fen: KINGS, answer: ['h6'], prompt: 'Click h6.', explanation: 'h6: the last file on White’s right, sixth rank.', hints: [], difficulty: 1, objective: 'Name any square from White’s side', themes: ['coordinates'] },
  ],
  prerequisites: [],
  attribution: RULES,
};

const pieces: Lesson = {
  id: 'f-pieces',
  kingdom: 'foundation',
  title: 'How the Pieces Move and Capture',
  topics: ['Piece movements', 'Legal moves', 'Captures'],
  summary: 'Each piece has its own geometry. Learn it until captures jump out at you.',
  intro: 'Six kinds of piece, six ways of moving. A capture is simply moving onto a square occupied by an enemy piece and removing it.',
  objectives: ['Move each piece legally', 'Spot every capture available in a position', 'Recognise an undefended (“hanging”) piece'],
  concept: [
    'Rook: any number of squares along a rank or file. Bishop: any number of squares diagonally — it stays on one colour forever. Queen: rook and bishop combined.',
    'King: one square in any direction, and never onto a square attacked by the enemy. Knight: an “L” — two squares one way and one square sideways — and it is the only piece that jumps over others.',
    'Pawns move straight forward one square (two from their starting square) but capture one square diagonally forward. A pawn can never move backwards.',
    'No piece except the knight may jump over another piece. A move that leaves your own king attacked is illegal.',
  ],
  demo: {
    fen: '4k3/8/8/3q4/8/2N5/8/4K3 w - - 0 1',
    moves: ['Nxd5'],
    captions: [
      'White’s knight on c3 attacks d5, b5, a4, a2, b1, d1, e2 and e4. Black’s queen on d5 is attacked and nothing protects it.',
      'Knight takes queen: Nxd5. The “x” means a capture.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'f-pieces.g1', fen: '4k3/n7/8/8/8/8/8/R3K3 w - - 0 1', solution: ['Rxa7'], goal: { type: 'material', minGain: 3, depth: 2 }, prompt: 'White to move. Use the rook to capture the undefended piece.', explanation: 'The rook slides up the open a-file and captures the knight on a7. Nothing can recapture.', hints: ['Rooks move along files.', 'Look up the a-file.'], difficulty: 1, objective: 'Spot every capture available', themes: ['capture', 'rook'] },
    { kind: 'puzzle', id: 'f-pieces.g2', fen: '4k3/p7/8/8/8/8/P5r1/4K2B w - - 0 1', solution: ['Bxg2'], goal: { type: 'material', minGain: 5, depth: 2 }, prompt: 'White to move. The bishop can win a rook.', explanation: 'The bishop on h1 attacks along the long diagonal; g2 is the first square, and the rook there is undefended.', hints: ['Bishops move diagonally.'], difficulty: 1, objective: 'Spot every capture available', themes: ['capture', 'bishop'] },
    { kind: 'choice', id: 'f-pieces.g3', prompt: 'Which piece can jump over other pieces?', options: ['Bishop', 'Knight', 'Queen', 'Rook'], answer: 1, explanation: 'Only the knight jumps. Every other piece is blocked by anything in its path.', hints: ['Its move is shaped like an L.'], difficulty: 1, objective: 'Move each piece legally', themes: ['knight'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'f-pieces.i1', fen: '4k3/p7/8/5n2/4P3/8/P7/4K3 w - - 0 1', solution: ['exf5'], goal: { type: 'material', minGain: 3, depth: 2 }, prompt: 'White to move. Win a piece with the pawn.', explanation: 'Pawns capture diagonally forward: the e4-pawn takes on f5.', hints: ['Pawns move straight but capture diagonally.'], difficulty: 1, objective: 'Spot every capture available', themes: ['capture', 'pawn'] },
    { kind: 'choice', id: 'f-pieces.i2', fen: '8/8/8/8/8/8/8/N3K2k w - - 0 1', prompt: 'How many squares can the knight on a1 move to?', options: ['1', '2', '3', '4'], answer: 1, explanation: 'From the corner a knight reaches only b3 and c2. Knights are weakest on the edge.', hints: ['Try every L shape — most leave the board.'], difficulty: 2, objective: 'Move each piece legally', themes: ['knight'] },
    { kind: 'puzzle', id: 'f-pieces.i3', fen: '4k3/8/8/4p3/r2b4/8/8/3QK3 w - - 0 1', solution: ['Qxa4'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move. The queen can capture twice — but only one capture is safe. Take the right one.', explanation: 'Qxa4 wins a whole rook. Qxd4? would lose the queen to exd4, because the e5-pawn protects d4.', hints: ['Check whether each target is protected.', 'The pawn on e5 guards d4.'], difficulty: 2, objective: 'Recognise an undefended piece', themes: ['capture', 'hanging piece'] },
  ],
  application: [
    { kind: 'puzzle', id: 'f-pieces.a1', fen: '4k3/2p5/3b4/8/8/8/5n2/3RK3 w - - 0 1', solution: ['Kxf2'], goal: { type: 'material', minGain: 3, depth: 3 }, prompt: 'White to move. Your rook is attacked. Find the move that wins material.', explanation: 'The king captures the knight on f2 (the knight is not protected). Rxd6? cxd6 gives a rook for a bishop.', hints: ['The king can capture too.', 'Is the knight on f2 defended?'], difficulty: 2, objective: 'Recognise an undefended piece', themes: ['capture', 'king'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'f-pieces.e1', fen: '4k3/8/8/3n4/8/1r6/8/3QK3 w - - 0 1', solution: ['Qxb3'], goal: { type: 'material', minGain: 5, depth: 3 }, prompt: 'White to move. Win the most material.', explanation: 'Both black pieces hang, but the rook (5) is worth more than the knight (3): Qxb3.', hints: [], difficulty: 2, objective: 'Spot every capture available', themes: ['capture'] },
    { kind: 'choice', id: 'f-pieces.e2', prompt: 'A white pawn stands on e4 and a black pawn on e5. What can the e4-pawn do?', options: ['Capture e5', 'Move to e5', 'Nothing — it is blocked', 'Jump to e6'], answer: 2, explanation: 'Pawns cannot capture straight ahead, so two pawns facing each other block one another.', hints: [], difficulty: 1, objective: 'Move each piece legally', themes: ['pawn'] },
    { kind: 'puzzle', id: 'f-pieces.e3', fen: '4k3/p7/8/8/q7/2N5/P7/4K3 w - - 0 1', solution: ['Nxa4'], goal: { type: 'material', minGain: 9, depth: 2 }, prompt: 'White to move. Find the capture.', explanation: 'The knight on c3 jumps to a4 and wins the queen.', hints: [], difficulty: 1, objective: 'Spot every capture available', themes: ['capture', 'knight'] },
  ],
  prerequisites: ['f-coordinates'],
  attribution: RULES,
};

const checkmate: Lesson = {
  id: 'f-check',
  kingdom: 'foundation',
  title: 'Check, Checkmate and Stalemate',
  topics: ['Check', 'Checkmate', 'Stalemate'],
  summary: 'The goal of the game — and the trap that turns a win into a draw.',
  intro: 'A king is never captured. Instead, when it is attacked we say it is in check, and the game ends when a check cannot be escaped.',
  objectives: ['Tell check, checkmate and stalemate apart', 'Deliver mate in one', 'Avoid stalemating a lone king'],
  concept: [
    'Check: the king is attacked. The player must escape at once — move the king, capture the attacker, or block the line of attack.',
    'Checkmate: the king is in check and none of those escapes exist. The game is over; the side that delivered mate wins.',
    'Stalemate: the side to move is NOT in check but has no legal move. The game is drawn — a common way to throw away a winning position.',
  ],
  demo: {
    fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    moves: ['Ra8#'],
    captions: [
      'Black’s king is shut in by its own pawns on f7, g7 and h7.',
      'Ra8 is check along the 8th rank. The king cannot step forward, nothing can block or capture: checkmate.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'f-check.g1', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', solution: ['Ra8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Checkmate in one.', explanation: 'Ra8# — the classic back-rank mate.', hints: ['Black’s king has no escape squares in front of it.', 'Give check on the 8th rank.'], difficulty: 1, objective: 'Deliver mate in one', themes: ['mate in 1', 'back rank'] },
    { kind: 'choice', id: 'f-check.g2', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', prompt: 'Black to move. What is this position?', options: ['Check', 'Checkmate', 'Stalemate', 'Black can move the king to g8'], answer: 2, explanation: 'Black is not in check, but every king move lands on an attacked square: stalemate, a draw.', hints: ['Is the king attacked right now?', 'Check every square around h8.'], difficulty: 1, objective: 'Tell check, checkmate and stalemate apart', themes: ['stalemate'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'f-check.i1', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['Qxf7#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Black has just played …Nf6?? Punish it.', explanation: 'Qxf7# — the queen, protected by the bishop on c4, captures on f7 and the king cannot take her. This is “Scholar’s Mate”.', hints: ['f7 is defended only by the king.', 'Queen and bishop both aim at f7.'], difficulty: 1, objective: 'Deliver mate in one', themes: ['mate in 1', 'f7'] },
    { kind: 'puzzle', id: 'f-check.i2', fen: '7k/8/6K1/5Q2/8/8/8/8 w - - 0 1', solution: ['Qf8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one — but one tempting queen move is stalemate!', explanation: 'Qf8# or Qc8# mate along the back rank, while your king covers g7 and h7. Qf7?? takes away every square without giving check — stalemate.', hints: ['Give check. A quiet move here stalemates.'], difficulty: 2, objective: 'Avoid stalemating a lone king', themes: ['mate in 1', 'stalemate'] },
  ],
  application: [
    { kind: 'choice', id: 'f-check.a1', fen: 'R5k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', prompt: 'Black to move. What is the result?', options: ['Black is in check and can play …Kh8', 'Checkmate — White wins', 'Stalemate — draw', 'Black is not in check'], answer: 1, explanation: 'The rook on a8 checks along the 8th rank; f8 and h8 are also covered by it, and the pawns block the rest.', hints: ['Look at every square the king might use.'], difficulty: 1, objective: 'Tell check, checkmate and stalemate apart', themes: ['checkmate'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'f-check.e1', fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1', solution: ['Qb8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Checkmate in one.', explanation: 'Qb8#. The queen checks along the back rank, and the white king covers g7 and h7.', hints: [], difficulty: 2, objective: 'Deliver mate in one', themes: ['mate in 1'] },
    { kind: 'choice', id: 'f-check.e2', prompt: 'Your king is in check. Which of these is NOT a legal way to respond?', options: ['Move the king to a safe square', 'Capture the checking piece', 'Block the check with a piece', 'Make any move and ignore the check'], answer: 3, explanation: 'You must get out of check immediately; ignoring it is illegal.', hints: [], difficulty: 1, objective: 'Tell check, checkmate and stalemate apart', themes: ['check'] },
    { kind: 'choice', id: 'f-check.e3', fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', prompt: 'Black to move. What is this position?', options: ['Checkmate', 'Stalemate', 'Check', 'Black plays …Kb8'], answer: 1, explanation: 'The king on a8 is not attacked, but a7, b7 and b8 are all covered: stalemate.', hints: [], difficulty: 2, objective: 'Tell check, checkmate and stalemate apart', themes: ['stalemate'] },
  ],
  prerequisites: ['f-pieces'],
  attribution: ORIGINAL,
};

const special: Lesson = {
  id: 'f-special',
  kingdom: 'foundation',
  title: 'Castling, En Passant and Promotion',
  topics: ['Castling', 'En passant', 'Promotion'],
  summary: 'The three special moves every player must know cold.',
  intro: 'Three rules break the normal patterns of movement. They appear in almost every game, so you must recognise when they are legal.',
  objectives: ['Know when castling is legal', 'Capture en passant', 'Promote a pawn and choose the right piece'],
  concept: [
    'Castling: the king moves two squares towards a rook and the rook jumps to the square the king crossed. O-O is kingside (king to g1/g8), O-O-O is queenside (king to c1/c8).',
    'You may not castle if the king or that rook has moved, if any square between them is occupied, if you are in check, or if the king would pass through or land on an attacked square.',
    'En passant: when a pawn advances two squares and lands beside an enemy pawn, that enemy pawn may capture it as if it had moved only one square — but only on the very next move.',
    'Promotion: a pawn that reaches the last rank must become a queen, rook, bishop or knight. Usually a queen; occasionally a knight gives check or a fork the queen cannot.',
  ],
  demo: {
    fen: 'rnbqkbnr/pppppppp/8/4P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2',
    moves: ['d5', 'exd6'],
    captions: [
      'White’s pawn has reached e5.',
      'Black pushes …d7–d5, two squares, landing next to the e5-pawn.',
      'White captures en passant: exd6. The black pawn is removed from d5 even though White’s pawn lands on d6.',
    ],
  },
  guided: [
    { kind: 'square', id: 'f-special.g1', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', answer: ['g1'], prompt: 'White wants to castle kingside. On which square will the king land?', explanation: 'In kingside castling the king goes e1→g1 and the rook h1→f1.', hints: ['The king moves exactly two squares.'], difficulty: 1, objective: 'Know when castling is legal', themes: ['castling'] },
    { kind: 'puzzle', id: 'f-special.g2', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', solution: ['exd6'], goal: { type: 'rule', rule: 'en-passant' }, prompt: 'Black has just played …d7–d5. Capture the pawn en passant.', explanation: 'exd6 e.p. — the pawn moves to d6 and the d5-pawn disappears.', hints: ['Your pawn moves diagonally to the square the black pawn skipped over.'], difficulty: 1, objective: 'Capture en passant', themes: ['en passant'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'f-special.i1', fen: '8/4P1k1/8/8/8/8/8/4K3 w - - 0 1', solution: ['e8=Q'], goal: { type: 'rule', rule: 'promotion' }, prompt: 'White to move. Promote the pawn to a queen.', explanation: 'e8=Q. The new queen appears on e8 immediately.', hints: ['Push the pawn to the 8th rank and pick the queen.'], difficulty: 1, objective: 'Promote a pawn', themes: ['promotion'] },
    { kind: 'choice', id: 'f-special.i2', fen: 'r3k2r/pppq1ppp/8/8/1b6/8/PPP2PPP/R3K2R w KQkq - 0 1', prompt: 'White is in check from the bishop on b4. Can White castle?', options: ['Yes, kingside', 'Yes, queenside', 'No — you cannot castle out of check', 'Only if the rook has not moved'], answer: 2, explanation: 'Castling is never allowed while in check. White must deal with the check another way.', hints: ['Look at the rule list again.'], difficulty: 2, objective: 'Know when castling is legal', themes: ['castling'] },
    { kind: 'choice', id: 'f-special.i3', prompt: 'A black pawn moved d7–d5 two moves ago, landing beside your e5-pawn. Can you capture it en passant now?', options: ['Yes, any time', 'No — en passant is only allowed on the very next move', 'Only if it gives check', 'Only with a knight'], answer: 1, explanation: 'The right to capture en passant expires immediately if you do not use it.', hints: [], difficulty: 2, objective: 'Capture en passant', themes: ['en passant'] },
  ],
  application: [
    { kind: 'choice', id: 'f-special.a1', fen: 'r3k2r/pppppppp/8/8/2b5/8/PPPPPPPP/R3K2R w KQkq - 0 1', prompt: 'The black bishop on c4 attacks f1. Which castling is legal for White?', options: ['Kingside only', 'Queenside only', 'Neither', 'Both'], answer: 1, explanation: 'Kingside castling would pass the king across f1, which is attacked, so it is illegal. Queenside is fine.', hints: ['The king may not pass through an attacked square.'], difficulty: 3, objective: 'Know when castling is legal', themes: ['castling'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'f-special.e1', fen: '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1', orientation: 'black', solution: ['dxe3'], goal: { type: 'rule', rule: 'en-passant' }, prompt: 'Black to move. White has just played e2–e4. Capture en passant.', explanation: '…dxe3 e.p.: the d4-pawn captures the e4-pawn by moving to e3.', hints: [], difficulty: 2, objective: 'Capture en passant', themes: ['en passant'] },
    { kind: 'choice', prompt: 'After O-O-O by Black, where do the king and rook stand?', id: 'f-special.e2', options: ['King g8, rook f8', 'King c8, rook d8', 'King b8, rook c8', 'King c8, rook b8'], answer: 1, explanation: 'Queenside castling: king e8→c8, rook a8→d8.', hints: [], difficulty: 2, objective: 'Know when castling is legal', themes: ['castling'] },
    { kind: 'choice', prompt: 'Why might a player promote to a knight instead of a queen?', id: 'f-special.e3', options: ['A knight is worth more', 'The knight gives check or a fork that a queen cannot', 'Queens are not allowed after move 40', 'To avoid the 50-move rule'], answer: 1, explanation: 'Underpromotion is rare; it is chosen when the knight’s unique jump delivers check, a fork or avoids stalemate.', hints: [], difficulty: 2, objective: 'Promote a pawn and choose the right piece', themes: ['promotion'] },
  ],
  prerequisites: ['f-check'],
  attribution: RULES,
};

const material: Lesson = {
  id: 'f-material',
  kingdom: 'foundation',
  title: 'Material Value',
  topics: ['Material value'],
  summary: 'Count before you capture: the point values that guide every trade.',
  intro: 'Not all pieces are equal. A standard scale lets you judge trades quickly — although position can change the real value.',
  objectives: ['Know the standard values', 'Choose the most valuable safe capture', 'Avoid losing trades'],
  concept: [
    'Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9. The king is priceless — losing it loses the game.',
    'Before capturing, count: what do I win, and what do I lose if my piece is recaptured?',
    'Giving a minor piece (3) for a rook (5) is “winning the exchange”. Values are guidelines: an active piece can be worth more than its number.',
  ],
  demo: {
    fen: '4k3/8/8/3n4/8/1r6/8/3QK3 w - - 0 1',
    moves: ['Qxb3'],
    captions: ['The queen can capture the knight (3) or the rook (5). Both are undefended.', 'Qxb3: always take the bigger safe prize.'],
  },
  guided: [
    { kind: 'choice', id: 'f-material.g1', prompt: 'What is the usual value of a rook?', options: ['3', '5', '9', '1'], answer: 1, explanation: 'A rook is worth about 5 pawns.', hints: ['Between a minor piece and a queen.'], difficulty: 1, objective: 'Know the standard values', themes: ['material'] },
    { kind: 'choice', id: 'f-material.g2', prompt: 'You capture a bishop with your rook, and your rook is then recaptured. How much material did you gain?', options: ['+3', '+2', '−2', '0'], answer: 2, explanation: 'You won 3 but lost 5: a net loss of 2.', hints: ['Gain minus loss.'], difficulty: 1, objective: 'Avoid losing trades', themes: ['material'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'f-material.i1', fen: '4k3/8/8/8/2b5/8/8/4KQ2 w - - 0 1', solution: ['Qxc4'], goal: { type: 'material', minGain: 3, depth: 2 }, prompt: 'White to move. The bishop attacks your queen. Win material.', explanation: 'Qxc4 captures the undefended bishop along the same diagonal it was attacking on.', hints: ['If it attacks you along a line, you attack it along the same line.'], difficulty: 1, objective: 'Choose the most valuable safe capture', themes: ['material'] },
    { kind: 'choice', id: 'f-material.i2', prompt: 'Which trade is best for you?', options: ['Your knight for their bishop', 'Your rook for their knight', 'Your bishop for their rook', 'Your queen for their rook'], answer: 2, explanation: 'Bishop (3) for rook (5) wins the exchange: +2.', hints: ['Compare values.'], difficulty: 2, objective: 'Know the standard values', themes: ['material'] },
  ],
  application: [
    { kind: 'puzzle', id: 'f-material.a1', fen: '4k3/8/2p5/3b4/7n/8/6N1/3RK3 w - - 0 1', solution: ['Nxh4'], goal: { type: 'material', minGain: 3, depth: 3 }, prompt: 'White to move. Two captures are possible. Which one wins material?', explanation: 'Nxh4 wins a clean knight. Rxd5? cxd5 gives a rook (5) for a bishop (3): −2.', hints: ['Is d5 protected?'], difficulty: 2, objective: 'Avoid losing trades', themes: ['material'] },
  ],
  exam: [
    { kind: 'choice', id: 'f-material.e1', prompt: 'Two rooks versus a queen: roughly how does material compare?', options: ['Rooks +1', 'Queen +4', 'Equal', 'Rooks +5'], answer: 0, explanation: '5 + 5 = 10 versus 9: the rooks are about one pawn ahead on the scale.', hints: [], difficulty: 2, objective: 'Know the standard values', themes: ['material'] },
    { kind: 'puzzle', id: 'f-material.e2', fen: 'k6r/p7/8/8/8/8/1B5P/4K3 w - - 0 1', solution: ['Bxh8'], goal: { type: 'material', minGain: 5, depth: 2 }, prompt: 'White to move. Win material.', explanation: 'The bishop sweeps the long diagonal and captures the rook on h8.', hints: [], difficulty: 1, objective: 'Choose the most valuable safe capture', themes: ['material'] },
  ],
  prerequisites: ['f-pieces'],
  attribution: ORIGINAL,
};

const basicMates: Lesson = {
  id: 'f-basic-mates',
  kingdom: 'foundation',
  title: 'Basic Checkmates',
  topics: ['Basic checkmates'],
  summary: 'King and queen, king and rook: force mate against a lone king.',
  intro: 'With a queen or a rook extra you should always win. The technique: use your king, shrink the enemy king’s box, and finish on the edge.',
  objectives: ['Deliver the edge mates with queen and rook', 'Use the king as a helper', 'Mate a lone king against best defence'],
  concept: [
    'A lone king can only be mated on the edge of the board (or in a corner). Push it there step by step.',
    'Your king must help: in the final picture it stands opposite the enemy king, covering the squares in front of it, while the queen or rook checks along the edge.',
    'Watch out for stalemate: when the enemy king has very few squares, every move must leave it at least one, or give check.',
  ],
  demo: {
    fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1',
    moves: ['Kg6', 'Kg8', 'Ra8#'],
    captions: [
      'King and rook against king. Black’s king is already on the edge.',
      'Kg6 — the king steps opposite, covering f7, g7 and h7.',
      'Black has only …Kg8.',
      'Ra8# — the rook checks along the edge; the white king covers the escape squares.',
    ],
  },
  guided: [
    { kind: 'puzzle', id: 'f-mates.g1', fen: '6k1/8/6K1/8/8/8/8/R7 w - - 0 1', solution: ['Ra8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one with the rook.', explanation: 'Ra8#. The king on g6 covers f7, g7 and h7; the rook covers the 8th rank.', hints: ['Check along the 8th rank.'], difficulty: 1, objective: 'Deliver the edge mates with queen and rook', themes: ['mate in 1', 'rook mate'] },
    { kind: 'puzzle', id: 'f-mates.g2', fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', solution: ['Qh8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one with the queen.', explanation: 'Qh8# along the 8th rank; the king on b6 covers a7 and b7.', hints: ['Your king already covers a7 and b7.'], difficulty: 1, objective: 'Deliver the edge mates with queen and rook', themes: ['mate in 1', 'queen mate'] },
  ],
  independent: [
    { kind: 'puzzle', id: 'f-mates.i1', fen: '7k/8/5K2/8/8/8/8/R7 w - - 0 1', solution: ['Kg6', 'Kg8', 'Ra8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: 'Bring the king opposite: 1.Kg6 Kg8 2.Ra8#. (1.Kf7 Kh7 2.Rh1# also works.) A rook check first only lets the king out.', hints: ['Do not check yet — improve your king.', 'Which square puts your king opposite Black’s?'], difficulty: 2, objective: 'Use the king as a helper', themes: ['mate in 2', 'rook mate'] },
    { kind: 'puzzle', id: 'f-mates.i2', fen: '3k4/8/3K4/8/8/8/8/7Q w - - 0 1', solution: ['Qh8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one.', explanation: 'Qh8# — the king on d6 covers c7, d7 and e7; the queen covers the whole 8th rank.', hints: ['The king opposite the king does half the work.'], difficulty: 1, objective: 'Deliver the edge mates with queen and rook', themes: ['mate in 1', 'queen mate'] },
  ],
  application: [
    { kind: 'playout', id: 'f-mates.a1', fen: '8/8/3k4/8/8/8/8/2Q1K3 w - - 0 1', goal: 'mate', maxMoves: 15, opponent: 'stockfish', prompt: 'King and queen versus king. Checkmate the black king within 15 moves. Stockfish defends.', explanation: 'Use the queen to box the king in (a knight’s move away), walk your king up, then mate on the edge. Never leave the king without a move unless you give check.', hints: ['Place the queen a knight’s jump from the black king to shrink its box.', 'Bring your own king closer before giving mate.'], difficulty: 2, objective: 'Mate a lone king against best defence', themes: ['queen mate', 'technique'] },
    { kind: 'playout', id: 'f-mates.a2', fen: '8/8/3k4/8/8/8/8/R3K3 w - - 0 1', goal: 'mate', maxMoves: 25, opponent: 'stockfish', prompt: 'King and rook versus king. Checkmate within 25 moves. Stockfish defends.', explanation: 'Cut the king off along a rank or file with the rook, bring your king opposite, and push the box one line at a time.', hints: ['The rook builds a wall; the king pushes.', 'When kings stand opposite, a rook check drives the king back one line.'], difficulty: 3, objective: 'Mate a lone king against best defence', themes: ['rook mate', 'technique'] },
  ],
  exam: [
    { kind: 'puzzle', id: 'f-mates.e1', fen: 'k7/8/2K5/8/8/8/8/7R w - - 0 1', solution: ['Kb6', 'Kb8', 'Rh8#'], goal: { type: 'mate', in: 2 }, prompt: 'White to move. Mate in two.', explanation: '1.Kb6 Kb8 2.Rh8# (or 1.Kc7 Ka7 2.Ra1#). The king comes opposite first.', hints: [], difficulty: 3, objective: 'Use the king as a helper', themes: ['mate in 2', 'rook mate'] },
    { kind: 'puzzle', id: 'f-mates.e2', fen: '5k2/8/5K2/8/8/8/8/R7 w - - 0 1', solution: ['Ra8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one.', explanation: 'Ra8#: the king covers e7, f7 and g7; the rook covers e8 and g8.', hints: [], difficulty: 1, objective: 'Deliver the edge mates with queen and rook', themes: ['mate in 1', 'rook mate'] },
  ],
  prerequisites: ['f-check'],
  attribution: ORIGINAL,
};

const principles: Lesson = {
  id: 'f-principles',
  kingdom: 'foundation',
  title: 'Opening Principles',
  topics: ['Chess principles'],
  summary: 'Centre, development, king safety: three rules that steer the first ten moves.',
  intro: 'You do not need to memorise openings to play the first moves well. Three principles get you there.',
  objectives: ['Fight for the centre', 'Develop knights and bishops before moving the queen', 'Castle early'],
  concept: [
    'Control the centre (e4, d4, e5, d5) with pawns and pieces: central pieces reach more squares.',
    'Develop: bring knights and bishops off the back rank, usually knights before bishops, and avoid moving the same piece twice without a reason.',
    'Keep the queen back early — she is easily chased by smaller pieces, costing you time.',
    'Castle to tuck the king away and connect the rooks.',
  ],
  demo: {
    fen: START,
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
    captions: [
      'The opening begins.',
      '1.e4 claims the centre and opens lines for the queen and bishop.',
      '1…e5 does the same for Black.',
      '2.Nf3 develops and attacks e5.',
      '2…Nc6 develops and defends it.',
      '3.Bc4 develops towards the weak f7-square.',
      '3…Bc5 mirrors.',
      '4.O-O: the king is safe and the rook is ready to join the game.',
    ],
  },
  guided: [
    { kind: 'choice', id: 'f-princ.g1', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', prompt: 'White to move. Which move follows the opening principles best?', options: ['h4', 'Nf3', 'a3', 'Ke2'], answer: 1, explanation: 'Nf3 develops a piece towards the centre and attacks the e5-pawn.', hints: ['Develop a piece towards the centre.'], difficulty: 1, objective: 'Develop knights and bishops', themes: ['opening principles'] },
    { kind: 'choice', id: 'f-princ.g2', prompt: 'What are the two main purposes of castling?', options: ['Win a pawn and attack', 'King safety and connecting the rooks', 'Control the centre and develop the queen', 'Avoid stalemate'], answer: 1, explanation: 'Castling hides the king and brings a rook towards the centre.', hints: [], difficulty: 1, objective: 'Castle early', themes: ['opening principles'] },
  ],
  independent: [
    { kind: 'choice', id: 'f-princ.i1', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', prompt: 'White to move. Which move follows the principles?', options: ['Ng1', 'O-O', 'Rg1', 'Ke2'], answer: 1, explanation: 'O-O castles to safety. Ng1 undevelops, Rg1 and Ke2 ruin the king’s safety.', hints: ['Where is your king safest?'], difficulty: 1, objective: 'Castle early', themes: ['opening principles'] },
    { kind: 'choice', id: 'f-princ.i2', prompt: 'Why is bringing the queen out very early often a mistake?', options: ['The queen cannot move far', 'Enemy pieces can attack her and gain time while developing', 'It is illegal before move 5', 'It blocks castling'], answer: 1, explanation: 'Each time the queen must run, the opponent develops with tempo.', hints: [], difficulty: 1, objective: 'Develop knights and bishops before moving the queen', themes: ['opening principles'] },
  ],
  application: [
    { kind: 'choice', id: 'f-princ.a1', fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2', prompt: 'After 1.d4 d5, which plan respects the principles?', options: ['Develop Nf3, a bishop, then castle', 'Push the h- and g-pawns', 'Move the queen out to attack', 'Walk the king to the centre'], answer: 0, explanation: 'Develop minor pieces, then castle. Pawn storms and early queen raids waste time.', hints: [], difficulty: 1, objective: 'Fight for the centre', themes: ['opening principles'] },
  ],
  exam: [
    { kind: 'choice', id: 'f-princ.e1', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', prompt: 'Which first move does the most for the centre?', options: ['a4', 'h3', 'e4', 'Na3'], answer: 2, explanation: '1.e4 occupies the centre and frees the queen and king’s bishop.', hints: [], difficulty: 1, objective: 'Fight for the centre', themes: ['opening principles'] },
    { kind: 'choice', id: 'f-princ.e2', prompt: 'Which piece should usually be developed last of these?', options: ['Knight', 'Bishop', 'Queen', 'Castle first, then the knights'], answer: 2, explanation: 'Minor pieces first; the queen usually develops after them.', hints: [], difficulty: 1, objective: 'Develop knights and bishops before moving the queen', themes: ['opening principles'] },
  ],
  prerequisites: ['f-special'],
  attribution: ORIGINAL,
};

const notation: Lesson = {
  id: 'f-notation',
  kingdom: 'foundation',
  title: 'Notation and PGN',
  topics: ['Chess notation', 'Introduction to PGN'],
  summary: 'Read and write games the way books, databases and engines do.',
  intro: 'Algebraic notation records every move in a few characters. PGN is the file format that stores whole games.',
  objectives: ['Read and write algebraic notation', 'Understand check, mate and promotion symbols', 'Read a PGN file'],
  concept: [
    'Each move is the piece letter (K, Q, R, B, N; nothing for pawns) and the destination square: Nf3, Bb5, e4.',
    '“x” marks a capture (Nxe5, exd5), “+” check, “#” checkmate, “=Q” promotion, O-O and O-O-O castling. When two identical pieces can reach the same square, add the starting file or rank: Nbd2, R1e2.',
    'PGN (Portable Game Notation) is a text file: tag pairs such as [White "…"], [Result "1-0"], followed by numbered moves: 1.e4 e5 2.Nf3 Nc6.',
  ],
  demo: {
    fen: START,
    moves: ['e4', 'e5', 'Nf3', 'Nc6'],
    captions: ['In PGN this short game is written 1.e4 e5 2.Nf3 Nc6.', '1.e4', '1…e5 (three dots mean a Black move)', '2.Nf3', '2…Nc6'],
  },
  guided: [
    { kind: 'choice', id: 'f-not.g1', prompt: 'What does Nxe5 mean?', options: ['A knight moves to e5', 'A knight captures on e5', 'A pawn captures a knight on e5', 'Knight to e5, check'], answer: 1, explanation: 'N = knight, x = captures, e5 = the square.', hints: [], difficulty: 1, objective: 'Read and write algebraic notation', themes: ['notation'] },
    { kind: 'puzzle', id: 'f-not.g2', fen: START, solution: ['Nf3'], goal: { type: 'rule', rule: 'move' }, prompt: 'Play the move Nf3 on the board.', explanation: 'The knight from g1 goes to f3.', hints: ['Only one knight can reach f3.'], difficulty: 1, objective: 'Read and write algebraic notation', themes: ['notation'] },
  ],
  independent: [
    { kind: 'choice', id: 'f-not.i1', prompt: 'Which notation means “queenside castling”?', options: ['O-O', 'O-O-O', 'K-c1', '0-1'], answer: 1, explanation: 'O-O-O; and note 0-1 is a result (Black won), not a move.', hints: [], difficulty: 1, objective: 'Understand the symbols', themes: ['notation'] },
    { kind: 'choice', id: 'f-not.i2', prompt: 'In a PGN file, what does [Result "1/2-1/2"] mean?', options: ['White won', 'Black won', 'The game was drawn', 'The game is unfinished'], answer: 2, explanation: '1-0 White won, 0-1 Black won, 1/2-1/2 draw, * unfinished.', hints: [], difficulty: 1, objective: 'Read a PGN file', themes: ['pgn'] },
    { kind: 'choice', id: 'f-not.i3', prompt: 'Both knights on b1 and f3 can reach d2. How do you write the move of the b1-knight?', options: ['Nd2', 'Nbd2', 'N1d2', 'Nb-d2+'], answer: 1, explanation: 'Add the starting file to disambiguate: Nbd2.', hints: [], difficulty: 2, objective: 'Read and write algebraic notation', themes: ['notation'] },
  ],
  application: [
    { kind: 'puzzle', id: 'f-not.a1', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', solution: ['Bc4'], goal: { type: 'rule', rule: 'move' }, prompt: 'Position after 1.e4 e5. Play 2.Bc4.', explanation: 'The bishop from f1 travels to c4.', hints: ['Which bishop can reach c4?'], difficulty: 1, objective: 'Read and write algebraic notation', themes: ['notation'] },
  ],
  exam: [
    { kind: 'choice', id: 'f-not.e1', prompt: 'What does e8=Q# mean?', options: ['Pawn to e8, promotes to a queen, checkmate', 'Queen to e8, check', 'Pawn captures on e8', 'Queen sacrifice on e8'], answer: 0, explanation: '=Q is promotion, # is checkmate.', hints: [], difficulty: 1, objective: 'Understand the symbols', themes: ['notation'] },
    { kind: 'choice', id: 'f-not.e2', prompt: 'In “12…Rxd4+”, who moved and what happened?', options: ['White’s rook captured on d4 with check', 'Black’s rook captured on d4 with check', 'Black’s rook moved to d4 and mated', 'White castled'], answer: 1, explanation: 'Three dots mean Black’s move; R = rook, x = capture, + = check.', hints: [], difficulty: 1, objective: 'Read and write algebraic notation', themes: ['notation'] },
  ],
  prerequisites: ['f-coordinates'],
  attribution: RULES,
};

export const FOUNDATION_LESSONS = [coordinates, pieces, checkmate, special, material, basicMates, principles, notation];

export const FOUNDATION_BOSS: Task[] = [
  { kind: 'square', id: 'f-boss.1', fen: KINGS, orientation: 'black', answer: ['g5'], prompt: 'Board from Black’s side. Click g5.', explanation: 'From Black’s side the g-file is second from your left; rank 5 is the fourth row from you.', hints: [], difficulty: 2, objective: 'Name any square from Black’s side', themes: ['coordinates'] },
  { kind: 'puzzle', id: 'f-boss.2', fen: '6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 1', solution: ['Qb8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one.', explanation: 'Qb8# — back-rank mate with the queen.', hints: [], difficulty: 1, objective: 'Deliver mate in one', themes: ['mate in 1', 'back rank'] },
  { kind: 'puzzle', id: 'f-boss.3', fen: '4k3/8/8/1r6/8/8/8/1Q2K3 w - - 0 1', solution: ['Qxb5+'], goal: { type: 'material', minGain: 5, depth: 2 }, prompt: 'White to move. Your queen is attacked. Win material.', explanation: 'Qxb5+ — the rook was undefended, and the capture even gives check.', hints: [], difficulty: 1, objective: 'Recognise an undefended piece', themes: ['capture'] },
  { kind: 'puzzle', id: 'f-boss.4', fen: '5k2/8/5K2/8/8/8/8/1Q6 w - - 0 1', solution: ['Qb8#'], goal: { type: 'mate', in: 1 }, prompt: 'White to move. Mate in one.', explanation: 'Qb8#: the king covers e7, f7 and g7; the queen covers the 8th rank.', hints: [], difficulty: 1, objective: 'Deliver the edge mates', themes: ['mate in 1'] },
  { kind: 'choice', id: 'f-boss.5', fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', prompt: 'Black to move. Result?', options: ['Checkmate', 'Stalemate', 'Black plays …Kb8', 'Check'], answer: 1, explanation: 'Not in check, no legal move: stalemate.', hints: [], difficulty: 2, objective: 'Tell check, checkmate and stalemate apart', themes: ['stalemate'] },
  { kind: 'choice', id: 'f-boss.6', prompt: 'Which capture wins material: your knight takes a rook defended by a pawn, or your rook takes a knight defended by a pawn?', options: ['Knight takes rook (+2)', 'Rook takes knight (+2)', 'Both lose material', 'Both are equal'], answer: 0, explanation: 'N×R then pawn×N: +5 −3 = +2. R×N then pawn×R: +3 −5 = −2.', hints: [], difficulty: 2, objective: 'Avoid losing trades', themes: ['material'] },
];

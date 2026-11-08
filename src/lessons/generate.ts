import type { ArrowMark, MoveNode, SquareMark } from '../pgn/types.ts';
import { NAG_MEANING } from '../pgn/types.ts';
import { formatLine, pathTo, positionKey } from '../pgn/parser.ts';
import type { Chapter, Line, Repertoire } from '../repertoire/build.ts';
import { criticalKinds } from '../repertoire/build.ts';
import type { UserNote } from './notes.ts';

export type Expression =
  | 'neutral' | 'happy' | 'thinking' | 'surprised' | 'explaining' | 'serious' | 'laughing' | 'pointing';

/**
 * Where a sentence comes from. Kept separate so the student always knows what is
 * the user's own material, what is a plain factual description, and what is missing.
 */
export type Source = 'pgn' | 'notes' | 'auto' | 'missing';

export interface Utterance {
  text: string;
  source: Source;
}

export interface LessonStep {
  node: MoveNode | null; // null = intro/outro
  fen: string;
  lastMove?: [string, string];
  arrows: ArrowMark[];
  squares: SquareMark[];
  speech: Utterance[];
  expression: Expression;
  studentMove: boolean; // the student's side plays this move (used by practice mode)
}

export interface LessonScript {
  line: Line;
  chapter: Chapter;
  steps: LessonStep[];
}

const PIECES: Record<string, string> = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };

/** "Nxd5+" -> "Knight takes d5, check" — a literal reading of the move, nothing more. */
export function speakSan(san: string): string {
  if (san.startsWith('O-O-O')) return 'castles queenside' + (san.includes('+') ? ', check' : '');
  if (san.startsWith('O-O')) return 'castles kingside' + (san.includes('+') ? ', check' : '');
  const m = /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=([QRBN]))?([+#])?/.exec(san);
  if (!m) return san;
  const [, piece, file, rank, cap, dest, , promo, chk] = m;
  let s = piece ? PIECES[piece] : '';
  if (!piece && cap) s = file ?? '';
  else if (file || rank) s += ` ${file ?? ''}${rank ?? ''}`;
  s += cap ? ` takes ${dest}` : piece ? ` ${dest}` : dest;
  if (promo) s += `, promotes to ${PIECES[promo]}`;
  if (chk === '+') s += ', check';
  if (chk === '#') s += ', checkmate';
  return s.trim();
}

const stripForSpeech = (t: string) => t.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();

function pickExpression(node: MoveNode, texts: string[]): Expression {
  const all = texts.join(' ');
  if (/:\)|haha|\blol\b/i.test(all)) return 'laughing';
  if (node.nags.some((n) => n === 2 || n === 4 || n === 6)) return 'serious';
  if (/\?/.test(all)) return 'thinking';
  const anns = [...node.commentsBefore, ...node.commentsAfter];
  if (anns.some((a) => a.arrows.length || a.squares.length)) return 'pointing';
  if (node.nags.some((n) => n === 1 || n === 3)) return 'happy';
  if (node.nags.includes(5) || texts.length) return 'explaining';
  return 'neutral';
}

export function buildLessonScript(
  rep: Repertoire,
  line: Line,
  notes: Record<string, UserNote>,
): LessonScript {
  const chapter = rep.chapters.find((c) => c.id === line.chapterId)!;
  const side = rep.side;
  const sideName = side === 'w' ? 'White' : 'Black';
  const steps: LessonStep[] = [];
  const root = chapter.game.root;

  const intro: Utterance[] = [
    { text: `Chapter: ${chapter.title}. ${line.isMain ? 'Main line' : 'Line ' + line.label}. We have the ${sideName} pieces.`, source: 'auto' },
  ];
  if (line.isMain) for (const c of root.commentsAfter) if (stripForSpeech(c.text)) intro.push({ text: c.text, source: 'pgn' });
  steps.push({ node: null, fen: root.fen, arrows: [], squares: [], speech: intro, expression: 'happy', studentMove: false });

  for (const node of line.nodes) {
    const speech: Utterance[] = [];
    const who = node.color === side ? 'We play' : `${node.color === 'w' ? 'White' : 'Black'} plays`;
    speech.push({ text: `${node.moveNumber}${node.color === 'w' ? '.' : '...'} ${node.san} — ${who} ${speakSan(node.san)}.`, source: 'auto' });
    for (const c of node.commentsBefore) if (c.text) speech.push({ text: c.text, source: 'pgn' });
    for (const nag of node.nags) if (NAG_MEANING[nag]) speech.push({ text: `Marked in your file as: ${NAG_MEANING[nag]}.`, source: 'pgn' });
    for (const c of node.commentsAfter) if (c.text) speech.push({ text: c.text, source: 'pgn' });
    const note = notes[positionKey(node.fen)];
    if (note) speech.push({ text: note.text, source: 'notes' });

    const siblings = node.parent ? node.parent.children.filter((c) => c !== node) : [];
    if (siblings.length && node.color !== side) {
      speech.push({ text: `Your file also covers ${siblings.map((s) => s.san).join(', ')} here.`, source: 'auto' });
    }
    const kinds = criticalKinds(node);
    const hasExplanation = speech.some((u) => u.source === 'pgn' || u.source === 'notes');
    if (kinds.includes('question') && !note) {
      speech.push({ text: 'This question has no written answer in your material yet — add one in Notes.', source: 'missing' });
    } else if (node.color === side && !hasExplanation && (kinds.includes('key-move') || kinds.includes('interesting'))) {
      speech.push({ text: 'The idea behind this move is not explained in your material yet.', source: 'missing' });
    }

    const arrows = [...node.commentsBefore, ...node.commentsAfter].flatMap((c) => c.arrows);
    const squares = [...node.commentsBefore, ...node.commentsAfter].flatMap((c) => c.squares);
    steps.push({
      node,
      fen: node.fen,
      lastMove: [node.uci.slice(0, 2), node.uci.slice(2, 4)],
      arrows,
      squares,
      speech,
      expression: pickExpression(node, speech.filter((u) => u.source !== 'auto').map((u) => u.text)),
      studentMove: node.color === side,
    });
  }

  const ours = line.nodes.filter((n) => n.color === side).map((n) => n.san);
  const last = line.nodes[line.nodes.length - 1];
  steps.push({
    node: null,
    fen: last?.fen ?? root.fen,
    lastMove: last ? [last.uci.slice(0, 2), last.uci.slice(2, 4)] : undefined,
    arrows: [],
    squares: [],
    speech: [
      { text: `That's the line: ${formatLine(line.nodes)}.`, source: 'auto' },
      { text: `Your moves to remember: ${ours.join(', ')}.`, source: 'auto' },
    ],
    expression: 'happy',
    studentMove: false,
  });
  return { line, chapter, steps };
}

export interface Quiz {
  id: string;
  chapter: Chapter;
  node: MoveNode; // position the question is asked in
  kind: 'question' | 'find-move' | 'avoid-mistake' | 'punish';
  prompt: string;
  answerMoves: MoveNode[]; // continuation from the user's file
  answerNote?: string; // user's written answer, if any
}

/** Exercises built only from the user's material: their own questions, key moves and marked mistakes. */
export function buildQuizzes(rep: Repertoire, notes: Record<string, UserNote>): Quiz[] {
  const quizzes: Quiz[] = [];
  const continuation = (n: MoveNode, plies: number) => {
    const out: MoveNode[] = [];
    for (let c = n.children[0]; c && out.length < plies; c = c.children[0]) out.push(c);
    return out;
  };
  for (const { node, chapterId, kinds } of rep.critical) {
    const chapter = rep.chapters.find((c) => c.id === chapterId)!;
    const note = notes[positionKey(node.fen)]?.text;
    if (kinds.includes('question')) {
      const q = [...node.commentsBefore, ...node.commentsAfter].map((c) => c.text).find((t) => t.includes('?'))!;
      quizzes.push({ id: `q-${node.id}`, chapter, node, kind: 'question', prompt: q, answerMoves: continuation(node, 6), answerNote: note });
    }
    if (kinds.includes('key-move') && node.color === rep.side && node.parent) {
      quizzes.push({
        id: `k-${node.id}`,
        chapter,
        node: node.parent,
        kind: 'find-move',
        prompt: `Find the move your file marks as strong (${formatLine(pathTo(node.parent)) || 'start'}).`,
        answerMoves: [node],
        answerNote: note,
      });
    }
    if (kinds.includes('mistake') && node.color === rep.side && node.parent) {
      quizzes.push({
        id: `m-${node.id}`,
        chapter,
        node,
        kind: 'avoid-mistake',
        prompt: `Your file marks ${node.moveNumber}${node.color === 'w' ? '.' : '...'}${node.san} as a mistake. What goes wrong?`,
        answerMoves: continuation(node, 4),
        answerNote: note,
      });
    }
    if (kinds.includes('mistake') && node.color !== rep.side && node.children.length) {
      quizzes.push({
        id: `p-${node.id}`,
        chapter,
        node,
        kind: 'punish',
        prompt: `${formatLine(pathTo(node))} — your file marks the last move as a mistake. How do we punish it?`,
        answerMoves: continuation(node, 4),
        answerNote: note,
      });
    }
  }
  return quizzes;
}

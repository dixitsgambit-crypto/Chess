import { Chess } from 'chess.js';
import type { Annotation, ArrowMark, MoveNode, ParsedGame, ParseIssue, ShapeColor, SquareMark } from './types.ts';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const COLORS: Record<string, ShapeColor> = { R: 'red', G: 'green', B: 'blue', Y: 'yellow' };
const SUFFIX_NAGS: Record<string, number> = { '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6 };

type Token =
  | { kind: 'comment'; text: string }
  | { kind: 'open' }
  | { kind: 'close' }
  | { kind: 'nag'; value: number }
  | { kind: 'move'; san: string; raw: string }
  | { kind: 'result'; value: string };

/** Pull `[%csl ...]`, `[%cal ...]` and `[#]` commands out of a comment. */
export function parseAnnotation(raw: string): Annotation {
  const squares: SquareMark[] = [];
  const arrows: ArrowMark[] = [];
  let diagram = false;
  let text = raw.replace(/\[%(csl|cal)\s+([^\]]*)\]/g, (_m, cmd: string, body: string) => {
    for (const item of body.split(',').map((s) => s.trim()).filter(Boolean)) {
      const color = COLORS[item[0]] ?? 'green';
      if (cmd === 'csl' && /^[RGBY][a-h][1-8]$/.test(item)) squares.push({ square: item.slice(1), color });
      if (cmd === 'cal' && /^[RGBY][a-h][1-8][a-h][1-8]$/.test(item)) arrows.push({ from: item.slice(1, 3), to: item.slice(3, 5), color });
    }
    return ' ';
  });
  text = text.replace(/\[#\]/g, () => {
    diagram = true;
    return ' ';
  });
  // Rejoin URLs that were wrapped across lines ("https:// chessmood. com/...")
  text = text.replace(/https?:\/\/\s+/g, (m) => m.trim()).replace(/(\w)\. (com|org|net)\b/g, '$1.$2');
  text = text.replace(/\s+/g, ' ').trim();
  return { text, squares, arrows, diagram };
}

function tokenize(movetext: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < movetext.length) {
    const c = movetext[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '{') {
      const end = movetext.indexOf('}', i);
      const stop = end === -1 ? movetext.length : end;
      tokens.push({ kind: 'comment', text: movetext.slice(i + 1, stop) });
      i = stop + 1;
      continue;
    }
    if (c === ';') {
      const end = movetext.indexOf('\n', i);
      const stop = end === -1 ? movetext.length : end;
      tokens.push({ kind: 'comment', text: movetext.slice(i + 1, stop) });
      i = stop;
      continue;
    }
    if (c === '(') { tokens.push({ kind: 'open' }); i++; continue; }
    if (c === ')') { tokens.push({ kind: 'close' }); i++; continue; }
    const m = /^[^\s{}();]+/.exec(movetext.slice(i));
    if (!m) { i++; continue; }
    const word = m[0];
    i += word.length;
    if (word.startsWith('$')) { tokens.push({ kind: 'nag', value: Number(word.slice(1)) }); continue; }
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(word)) { tokens.push({ kind: 'result', value: word }); continue; }
    // Strip move numbers such as "12." or "12..." (possibly glued to the move: "12.Nf3")
    const stripped = word.replace(/^\d+\.*/, '');
    if (!stripped) continue;
    const suffix = /([!?]{1,2})$/.exec(stripped);
    const san = suffix ? stripped.slice(0, -suffix[1].length) : stripped;
    if (san) tokens.push({ kind: 'move', san: san.replace(/0-0-0/, 'O-O-O').replace(/0-0/, 'O-O'), raw: word });
    if (suffix && SUFFIX_NAGS[suffix[1]]) tokens.push({ kind: 'nag', value: SUFFIX_NAGS[suffix[1]] });
  }
  return tokens;
}

function pathSan(node: MoveNode | null): string {
  const moves: string[] = [];
  for (let n = node; n && n.parent; n = n.parent) moves.unshift(n.san);
  return moves.join(' ');
}

function makeRoot(gameIndex: number, fen: string): MoveNode {
  return {
    id: `g${gameIndex}`, gameIndex, ply: 0, san: '', uci: '', color: null, moveNumber: 0,
    fenBefore: fen, fen, parent: null, children: [], commentsBefore: [], commentsAfter: [], nags: [],
    captured: false, check: false, castle: false,
  };
}

function buildTree(gameIndex: number, startFen: string, tokens: Token[], issues: ParseIssue[]): MoveNode {
  const root = makeRoot(gameIndex, startFen);
  let counter = 0;
  // `cursor` = node after which the next move is played; `last` = last move created at this depth
  let cursor = root;
  let last: MoveNode | null = null;
  let pendingBefore: Annotation[] = [];
  const stack: { cursor: MoveNode; last: MoveNode | null }[] = [];
  // When a move is illegal we skip the rest of that variation but record the raw text.
  let skipDepth = -1;
  let skipped: string[] = [];

  const flushSkip = () => {
    if (issues.length && skipped.length) issues[issues.length - 1].skippedText = skipped.join(' ');
    skipDepth = -1;
    skipped = [];
  };

  for (const tok of tokens) {
    if (skipDepth >= 0) {
      if (tok.kind === 'open') { skipped.push('('); stack.push({ cursor, last }); continue; }
      if (tok.kind === 'close') {
        if (stack.length === skipDepth) { flushSkip(); }
        else { skipped.push(')'); stack.pop(); continue; }
      } else {
        skipped.push(tok.kind === 'move' ? tok.raw : tok.kind === 'comment' ? `{${tok.text}}` : tok.kind === 'nag' ? `$${tok.value}` : '');
        continue;
      }
    }
    switch (tok.kind) {
      case 'comment': {
        const ann = parseAnnotation(tok.text);
        if (last) last.commentsAfter.push(ann);
        else if (cursor === root && stack.length === 0) root.commentsAfter.push(ann);
        else pendingBefore.push(ann);
        break;
      }
      case 'nag':
        if (last) last.nags.push(tok.value);
        break;
      case 'open':
        if (!last) {
          issues.push({ gameIndex, message: 'Variation opened before any move', context: pathSan(cursor), skippedText: '' });
          skipDepth = stack.length;
          stack.push({ cursor, last });
          break;
        }
        stack.push({ cursor, last });
        // A variation is an alternative to `last`, so it starts from last's parent
        cursor = last.parent!;
        last = null;
        break;
      case 'close': {
        const frame = stack.pop();
        if (!frame) {
          issues.push({ gameIndex, message: 'Unbalanced ")"', context: pathSan(cursor), skippedText: '' });
          break;
        }
        cursor = frame.cursor;
        last = frame.last;
        pendingBefore = [];
        break;
      }
      case 'move': {
        const from: MoveNode = last ?? cursor;
        const chess = new Chess(from.fen);
        let mv;
        try {
          mv = chess.move(tok.san);
        } catch {
          mv = null;
        }
        if (!mv) {
          issues.push({
            gameIndex,
            message: `Illegal or unreadable move "${tok.raw}"`,
            context: pathSan(from),
            skippedText: '',
          });
          skipDepth = stack.length;
          skipped = [tok.raw];
          if (stack.length === 0) {
            // Main line broken: nothing more can be attached for this game.
            skipDepth = 0;
          }
          break;
        }
        const uci = mv.from + mv.to + (mv.promotion ?? '');
        const existing = from.children.find((c) => c.uci === uci);
        if (existing) {
          // Same move given twice (e.g. a variation repeating the main move): merge instead of duplicating
          existing.commentsBefore.push(...pendingBefore);
          pendingBefore = [];
          last = existing;
          cursor = from;
          break;
        }
        const node: MoveNode = {
          id: `g${gameIndex}n${++counter}`,
          gameIndex,
          ply: from.ply + 1,
          san: mv.san,
          uci,
          color: mv.color,
          moveNumber: Math.floor(from.ply / 2) + 1,
          fenBefore: from.fen,
          fen: chess.fen(),
          parent: from,
          children: [],
          commentsBefore: pendingBefore,
          commentsAfter: [],
          nags: [],
          captured: Boolean(mv.captured),
          check: chess.isCheck(),
          castle: mv.flags.includes('k') || mv.flags.includes('q'),
        };
        pendingBefore = [];
        from.children.push(node);
        cursor = from;
        last = node;
        break;
      }
      case 'result':
        break;
    }
  }
  if (skipDepth >= 0) flushSkip();
  if (stack.length) issues.push({ gameIndex, message: `${stack.length} unclosed variation(s)`, context: '', skippedText: '' });
  return root;
}

/** Split a multi-game PGN into games and parse each into a validated move tree. */
export function parsePgn(text: string, gameIndexOffset = 0): ParsedGame[] {
  const games: ParsedGame[] = [];
  const lines = text.replace(/^﻿/, '').split(/\r\n?|\n/);
  const HEADER = /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/;
  // A header line that follows movetext starts a new game.
  const raw: { headers: Record<string, string>; movetext: string[] }[] = [];
  let cur: { headers: Record<string, string>; movetext: string[] } | null = null;
  for (const line of lines) {
    const m = HEADER.exec(line);
    if (m) {
      if (!cur || cur.movetext.some((l) => l.trim())) raw.push((cur = { headers: {}, movetext: [] }));
      cur.headers[m[1]] = m[2];
    } else {
      if (!cur) raw.push((cur = { headers: {}, movetext: [] }));
      cur.movetext.push(line);
    }
  }

  for (const { headers, movetext: mt } of raw) {
    const movetext = mt.join('\n');
    if (!movetext.trim() && Object.keys(headers).length === 0) continue;
    const index = gameIndexOffset + games.length;
    const issues: ParseIssue[] = [];
    let startFen = START_FEN;
    if (headers.FEN) {
      try { new Chess(headers.FEN); startFen = headers.FEN; }
      catch { issues.push({ gameIndex: index, message: `Invalid FEN header "${headers.FEN}"`, context: '', skippedText: '' }); }
    }
    const root = buildTree(index, startFen, tokenize(movetext), issues);
    games.push({ index, headers, root, issues });
  }
  return games;
}

export function* walk(node: MoveNode): Generator<MoveNode> {
  yield node;
  for (const c of node.children) yield* walk(c);
}

export function pathTo(node: MoveNode): MoveNode[] {
  const path: MoveNode[] = [];
  for (let n: MoveNode | null = node; n && n.parent; n = n.parent) path.unshift(n);
  return path;
}

export function formatLine(nodes: MoveNode[]): string {
  return nodes
    .map((n, i) => (n.color === 'w' ? `${n.moveNumber}.${n.san}` : i === 0 ? `${n.moveNumber}...${n.san}` : n.san))
    .join(' ');
}

/** Position key without move counters, used for transposition detection. */
export const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ');

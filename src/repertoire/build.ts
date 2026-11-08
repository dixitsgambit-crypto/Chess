import type { MoveNode, ParsedGame } from '../pgn/types.ts';
import { formatLine, pathTo, positionKey, walk } from '../pgn/parser.ts';

export type CriticalKind = 'question' | 'key-move' | 'mistake' | 'interesting' | 'diagram' | 'branch' | 'plan';

export interface Line {
  id: string;
  chapterId: string;
  index: number;
  nodes: MoveNode[];
  label: string; // where this line leaves the chapter's main line
  isMain: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  eco: string;
  annotator: string;
  game: ParsedGame;
  lines: Line[];
}

export interface Course {
  id: string;
  title: string;
  chapters: Chapter[];
}

export interface Critical {
  node: MoveNode;
  chapterId: string;
  kinds: CriticalKind[];
}

export interface Transposition {
  key: string;
  nodes: MoveNode[];
  lines: string[];
  sameMoves: boolean; // identical move sequence in different chapters (duplicate) vs. different order (transposition)
}

export interface Repertoire {
  side: 'w' | 'b';
  games: ParsedGame[];
  courses: Course[];
  chapters: Chapter[];
  transpositions: Transposition[];
  critical: Critical[];
  byPosition: Map<string, MoveNode[]>;
  chapterOf: (node: MoveNode) => Chapter;
}

const chapterTitle = (g: ParsedGame) => {
  const { White = '', Black = '', Event = '' } = g.headers;
  // Course files often store the chapter name in the White/Black/Event tag.
  for (const t of [White, Event, Black]) if (t && t !== '?') return t;
  return `Chapter ${g.index + 1}`;
};

function mainline(root: MoveNode): string[] {
  const ucis: string[] = [];
  for (let n = root.children[0]; n; n = n.children[0]) ucis.push(n.uci);
  return ucis;
}

function commonPrefix(a: string[], b: string[]) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Group chapters into courses using only the user's own material:
 * shared first words in chapter titles ("French …", "Dutch …"), then the
 * longest shared opening sequence for chapters whose title does not say.
 */
function groupCourses(chapters: Chapter[]): Course[] {
  const firstWord = (c: Chapter) => c.title.split(/\s+/)[0];
  const counts = new Map<string, number>();
  for (const c of chapters) counts.set(firstWord(c), (counts.get(firstWord(c)) ?? 0) + 1);
  const families = new Map<string, Chapter[]>();
  const unassigned: Chapter[] = [];
  for (const c of chapters) {
    const w = firstWord(c);
    if ((counts.get(w) ?? 0) >= 2 && /^[A-Za-z]/.test(w)) {
      if (!families.has(w)) families.set(w, []);
      families.get(w)!.push(c);
    } else unassigned.push(c);
  }
  for (const c of unassigned) {
    const ml = mainline(c.game.root);
    let best: string | null = null;
    let bestLen = 1;
    for (const [name, members] of families) {
      for (const m of members) {
        const len = commonPrefix(ml, mainline(m.game.root));
        if (len > bestLen) { bestLen = len; best = name; }
      }
    }
    const key = best ?? c.title;
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push(c);
  }
  return [...families.entries()].map(([title, chs], i) => ({ id: `course${i}`, title, chapters: chs }));
}

function buildLines(chapter: Chapter): Line[] {
  const lines: Line[] = [];
  const visit = (node: MoveNode) => {
    if (!node.children.length) {
      const nodes = pathTo(node);
      const isSide = (n: MoveNode) => n.parent!.children[0] !== n;
      const firstSide = nodes.findIndex(isSide);
      let lastSide = -1;
      nodes.forEach((n, i) => isSide(n) && (lastSide = i));
      // Label by where the line leaves the main line and, if deeper, where it last branches
      const label =
        firstSide === -1
          ? 'Main line'
          : formatLine(nodes.slice(firstSide, firstSide + 2)) +
            (lastSide > firstSide + 1 ? ' … ' + formatLine(nodes.slice(lastSide, lastSide + 2)) : '');
      lines.push({ id: `${chapter.id}-l${lines.length}`, chapterId: chapter.id, index: lines.length, nodes, label, isMain: firstSide === -1 });
      return;
    }
    node.children.forEach(visit);
  };
  visit(chapter.game.root);
  return lines;
}

function detectSide(games: ParsedGame[]): 'w' | 'b' {
  // Repertoire lines usually end on the student's move.
  let w = 0;
  let b = 0;
  for (const g of games) for (const n of walk(g.root)) if (n.parent && !n.children.length) n.color === 'w' ? w++ : b++;
  return w > b ? 'w' : 'b';
}

export function criticalKinds(node: MoveNode): CriticalKind[] {
  const kinds = new Set<CriticalKind>();
  const comments = [...node.commentsBefore, ...node.commentsAfter];
  if (comments.some((c) => c.text.includes('?'))) kinds.add('question');
  if (comments.some((c) => c.diagram)) kinds.add('diagram');
  if (comments.some((c) => /\b(plan|setup)\b/i.test(c.text))) kinds.add('plan');
  if (node.nags.some((n) => n === 1 || n === 3 || n === 7)) kinds.add('key-move');
  if (node.nags.some((n) => n === 2 || n === 4 || n === 6)) kinds.add('mistake');
  if (node.nags.includes(5)) kinds.add('interesting');
  if (node.children.length >= 2) kinds.add('branch');
  return [...kinds];
}

export function buildRepertoire(games: ParsedGame[]): Repertoire {
  const chapters: Chapter[] = games.map((game) => {
    const ch: Chapter = {
      id: `ch${game.index}`,
      title: chapterTitle(game),
      eco: game.headers.ECO ?? '',
      annotator: game.headers.Annotator ?? '',
      game,
      lines: [],
    };
    ch.lines = buildLines(ch);
    return ch;
  });
  const chapterByGame = new Map(chapters.map((c) => [c.game.index, c]));

  const byPosition = new Map<string, MoveNode[]>();
  const critical: Critical[] = [];
  for (const ch of chapters) {
    for (const n of walk(ch.game.root)) {
      if (!n.parent) continue;
      const k = positionKey(n.fen);
      if (!byPosition.has(k)) byPosition.set(k, []);
      byPosition.get(k)!.push(n);
      const kinds = criticalKinds(n);
      if (kinds.length) critical.push({ node: n, chapterId: ch.id, kinds });
    }
  }

  const transpositions: Transposition[] = [];
  for (const [key, nodes] of byPosition) {
    if (nodes.length < 2) continue;
    // Chapters sharing a common trunk (1.e4 e6 2.d4 d5 …) is expected; a transposition is
    // where lines arrive from *different* previous positions. Report only that meeting point.
    const parentKeys = new Set(nodes.map((n) => positionKey(n.fenBefore)));
    if (parentKeys.size < 2) continue;
    const seen = new Set<string>();
    const reps = nodes.filter((n) => {
      const s = pathTo(n).map((p) => p.uci).join(' ');
      return seen.has(s) ? false : (seen.add(s), true);
    });
    transpositions.push({
      key,
      nodes: reps,
      lines: reps.map((n) => `${chapterByGame.get(n.gameIndex)!.title}: ${formatLine(pathTo(n))}`),
      sameMoves: false,
    });
  }

  return {
    side: detectSide(games),
    games,
    courses: groupCourses(chapters),
    chapters,
    transpositions,
    critical,
    byPosition,
    chapterOf: (node) => chapterByGame.get(node.gameIndex)!,
  };
}

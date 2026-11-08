export type ShapeColor = 'green' | 'red' | 'blue' | 'yellow';

export interface SquareMark { square: string; color: ShapeColor }
export interface ArrowMark { from: string; to: string; color: ShapeColor }

/** A comment from the PGN with embedded graphical commands pulled out. */
export interface Annotation {
  text: string;
  squares: SquareMark[];
  arrows: ArrowMark[];
  diagram: boolean; // `[#]` marker: the annotator flagged this position
}

export interface MoveNode {
  id: string;
  gameIndex: number;
  ply: number; // 1 = White's first move; 0 for the root
  san: string; // '' for root
  uci: string;
  color: 'w' | 'b' | null;
  moveNumber: number;
  fenBefore: string;
  fen: string; // position after the move (root: start position)
  parent: MoveNode | null;
  children: MoveNode[]; // children[0] is the main continuation
  commentsBefore: Annotation[];
  commentsAfter: Annotation[];
  nags: number[];
  captured: boolean;
  check: boolean;
  castle: boolean;
}

export interface ParseIssue {
  gameIndex: number;
  message: string;
  context: string; // the move sequence leading to the problem
  skippedText: string; // raw text we could not attach to the tree
}

export interface ParsedGame {
  index: number;
  headers: Record<string, string>;
  root: MoveNode;
  issues: ParseIssue[];
}

export const NAG_SYMBOLS: Record<number, string> = {
  1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!', 7: '□', 10: '=', 13: '∞',
  14: '⩲', 15: '⩱', 16: '±', 17: '∓', 18: '+−', 19: '−+', 36: '→', 40: '→', 44: '=∞', 132: '⇆', 146: 'N',
};

export const NAG_MEANING: Record<number, string> = {
  1: 'good move', 2: 'mistake', 3: 'brilliant move', 4: 'blunder', 5: 'interesting move', 6: 'dubious move',
  7: 'only move', 10: 'equal position', 13: 'unclear position', 14: 'White is slightly better',
  15: 'Black is slightly better', 16: 'White is better', 17: 'Black is better', 18: 'White is winning', 19: 'Black is winning',
};

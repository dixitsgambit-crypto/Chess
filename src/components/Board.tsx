import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Chessground } from 'chessground';
import type { Api } from 'chessground/api';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { Chess } from 'chess.js';
import type { ArrowMark, SquareMark } from '../pgn/types';
import { BOARD_THEMES, useStore } from '../academy/store';
import { usePrefersReducedMotion } from '../academy/motion';
import 'chessground-assets/chessground.base.css';
import 'chessground-assets/chessground.brown.css';
import 'chessground-assets/chessground.cburnett.css';

export interface BoardProps {
  fen: string;
  orientation: 'white' | 'black';
  lastMove?: [string, string];
  arrows?: ArrowMark[];
  squares?: SquareMark[];
  /** Extra arrows from the engine — drawn in blue/paler so they never look like the user's own marks. */
  engineArrows?: { from: string; to: string }[];
  /** When set, the given side may move; the callback receives the UCI move. */
  movable?: 'white' | 'black' | null;
  onMove?: (uci: string) => void;
  /** Called when the user clicks a square (used for coordinate exercises). */
  onSquare?: (square: string) => void;
  /** Extra square highlights, e.g. green for a correct answer. */
  marks?: { square: string; tone: 'good' | 'bad' | 'hint' }[];
  label?: string;
}

function legalDests(fen: string): Map<Key, Key[]> {
  const dests = new Map<Key, Key[]>();
  const chess = new Chess(fen);
  for (const m of chess.moves({ verbose: true })) {
    const list = dests.get(m.from as Key) ?? [];
    list.push(m.to as Key);
    dests.set(m.from as Key, list);
  }
  return dests;
}

const PROMO = [['q', '♛', 'Queen'], ['r', '♜', 'Rook'], ['b', '♝', 'Bishop'], ['n', '♞', 'Knight']] as const;
const TONE = { good: 'green', bad: 'red', hint: 'yellow' } as const;

export function Board({ fen, orientation, lastMove, arrows = [], squares = [], engineArrows = [], movable = null, onMove, onSquare, marks = [], label }: BoardProps) {
  const el = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const onMoveRef = useRef(onMove);
  const onSquareRef = useRef(onSquare);
  onMoveRef.current = onMove;
  onSquareRef.current = onSquare;
  const { settings } = useStore();
  const reduced = usePrefersReducedMotion();
  const [promo, setPromo] = useState<{ from: string; to: string; color: 'w' | 'b' } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    if (!el.current) return;
    api.current = Chessground(el.current, {
      animation: { enabled: !reduced, duration: 260 },
      coordinates: settings.coordinates,
      drawable: { enabled: true, visible: true },
      highlight: { lastMove: true, check: true },
      events: { select: (key) => onSquareRef.current?.(key) },
    });
    // dev-only hook so automated checks can drive the board with synthetic events
    if (import.meta.env.DEV) (window as unknown as { __cg?: Api }).__cg = api.current;
    return () => api.current?.destroy();
  }, [settings.coordinates, reduced]);

  useEffect(() => {
    const cg = api.current;
    if (!cg) return;
    setPromo(null);
    const chess = new Chess(fen);
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    const canMove = !!movable && movable === turn;
    cg.set({
      fen,
      orientation,
      turnColor: turn,
      check: chess.isCheck(),
      lastMove: lastMove as Key[] | undefined,
      selected: undefined,
      movable: {
        free: false,
        color: canMove ? movable! : undefined,
        dests: canMove ? legalDests(fen) : new Map(),
        showDests: settings.showDests,
        events: {
          after: (orig, dest) => {
            const piece = chess.get(orig as never);
            const promotes = piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1');
            if (!promotes) return onMoveRef.current?.(orig + dest);
            if (settingsRef.current.autoQueen) return onMoveRef.current?.(orig + dest + 'q');
            setPromo({ from: orig, to: dest, color: piece!.color });
          },
        },
      },
    });
    const shapes: DrawShape[] = [
      ...squares.map((s) => ({ orig: s.square as Key, brush: s.color })),
      ...marks.map((m) => ({ orig: m.square as Key, brush: TONE[m.tone] })),
      ...arrows.map((a) => ({ orig: a.from as Key, dest: a.to as Key, brush: a.color })),
      ...engineArrows.map((a) => ({ orig: a.from as Key, dest: a.to as Key, brush: 'paleBlue' })),
    ];
    cg.setAutoShapes(shapes);
  }, [fen, orientation, lastMove?.[0], lastMove?.[1], JSON.stringify(arrows), JSON.stringify(squares), JSON.stringify(engineArrows), JSON.stringify(marks), movable, settings.showDests, settings.coordinates, reduced]);

  const choose = (p: string) => {
    if (!promo) return;
    const { from, to } = promo;
    setPromo(null);
    onMoveRef.current?.(from + to + p);
  };
  const cancel = () => {
    setPromo(null);
    api.current?.set({ fen });
  };

  const theme = BOARD_THEMES.find((t) => t.id === settings.boardTheme) ?? BOARD_THEMES[0];
  const style = { '--sq-light': theme.light, '--sq-dark': theme.dark } as CSSProperties;

  return (
    <div className="board-wrap" style={style} aria-label={label ?? 'Chessboard'}>
      <div ref={el} className="cg-board-host" />
      {promo && (
        <div className="promo-overlay" role="dialog" aria-label="Choose a promotion piece">
          <div className="promo-box">
            <div className="promo-title">Promote to</div>
            <div className="promo-row">
              {PROMO.map(([p, glyph, name]) => (
                <button key={p} className={`promo-piece ${promo.color === 'w' ? 'white' : 'black'}`} onClick={() => choose(p)} aria-label={name} title={name}>{glyph}</button>
              ))}
            </div>
            <button className="btn ghost small" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

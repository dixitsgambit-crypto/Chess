import { useEffect, useState } from 'react';
import { Board } from './Board';
import type { Line, Repertoire } from '../repertoire/build';
import { formatLine } from '../pgn/parser';
import { Teacher } from './Teacher';
import type { Expression } from '../lessons/generate';
import { labStats, setLabStats } from '../academy/lab';

type Stats = Record<string, { attempts: number; clean: number; last: number }>;

// Practice statistics are stored on the server with the player's Opening Laboratory data.
export function loadStats(): Stats {
  return { ...labStats() };
}

function saveStats(s: Stats) {
  setLabStats(s);
}

/** Drill: the student plays their side of a line from memory; the opponent's moves come from the file. */
export function Practice({ rep, line, onNextLine }: { rep: Repertoire; line: Line; onNextLine: () => void }) {
  const [pos, setPos] = useState(0); // number of moves of the line already on the board
  const [message, setMessage] = useState<{ text: string; mood: Expression }>({ text: 'Your move! Play the repertoire move.', mood: 'happy' });
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState(false);
  const side = rep.side;
  const nodes = line.nodes;
  const current = pos > 0 ? nodes[pos - 1] : null;
  const fen = current ? current.fen : rep.chapters.find((c) => c.id === line.chapterId)!.game.root.fen;
  const expected = nodes[pos];
  const done = pos >= nodes.length;

  useEffect(() => {
    setPos(0);
    setMistakes(0);
    setHint(false);
    setMessage({ text: 'Your move! Play the repertoire move.', mood: 'happy' });
  }, [line]);

  // Auto-play the opponent's moves from the file
  useEffect(() => {
    if (done) return;
    if (expected.color !== side) {
      const t = setTimeout(() => setPos((p) => p + 1), 650);
      return () => clearTimeout(t);
    }
  }, [pos, done]);

  useEffect(() => {
    if (!done) return;
    const stats = loadStats();
    const s = stats[line.id] ?? { attempts: 0, clean: 0, last: 0 };
    s.attempts++;
    if (mistakes === 0) s.clean++;
    s.last = Date.now();
    stats[line.id] = s;
    saveStats(stats);
    setMessage(mistakes === 0 ? { text: 'Perfect — line completed without mistakes!', mood: 'laughing' } : { text: `Line completed with ${mistakes} mistake(s). Try it again!`, mood: 'explaining' });
  }, [done]);

  const onMove = (uci: string) => {
    if (done || !expected) return;
    if (uci === expected.uci || (uci.length === 5 && uci.slice(0, 4) === expected.uci)) {
      setHint(false);
      setPos(pos + 1);
      const comment = [...expected.commentsAfter].map((c) => c.text).find(Boolean);
      setMessage({ text: comment ? `Correct! ${comment}` : 'Correct!', mood: 'happy' });
      return;
    }
    setMistakes((m) => m + 1);
    const alt = expected.parent?.children.find((c) => c.uci === uci);
    if (alt) {
      setMessage({ text: `${alt.san} is also in your file, but in a different line. This line continues with another move.`, mood: 'thinking' });
    } else {
      setMessage({ text: 'That move is not in your repertoire here. Try again (or ask for a hint).', mood: 'serious' });
    }
  };

  return (
    <div className="practice">
      <div className="practice-board">
        <Board
          key={`${line.id}-${mistakes}` /* remount after a wrong move to put the piece back */}
          fen={fen}
          orientation={side === 'w' ? 'white' : 'black'}
          lastMove={current ? [current.uci.slice(0, 2), current.uci.slice(2, 4)] : undefined}
          arrows={hint && expected ? [{ from: expected.uci.slice(0, 2), to: expected.uci.slice(2, 4), color: 'yellow' }] : []}
          movable={!done && expected?.color === side ? (side === 'w' ? 'white' : 'black') : null}
          onMove={onMove}
        />
      </div>
      <div className="practice-side">
        <Teacher expression={message.mood} size={220} />
        <div className="bubble">{message.text}</div>
        <p className="small"><b>{line.isMain ? 'Main line' : line.label}</b> · move {Math.min(pos + 1, nodes.length)} / {nodes.length} · mistakes {mistakes}</p>
        <div className="row">
          <button onClick={() => setHint(true)} disabled={done || expected?.color !== side}>Hint</button>
          <button onClick={() => { setPos(0); setMistakes(0); setMessage({ text: 'Again from the start.', mood: 'neutral' }); }}>Restart</button>
          <button className="primary" onClick={onNextLine}>Next line</button>
        </div>
        {done && <p className="muted small">{formatLine(nodes)}</p>}
      </div>
    </div>
  );
}

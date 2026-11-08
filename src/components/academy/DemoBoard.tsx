import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../Board';
import type { Demo } from '../../content/schema';
import { usePrefersReducedMotion } from '../../academy/motion';

/** Steps through a verified demonstration line with captions. */
export function DemoBoard({ demo }: { demo: Demo }) {
  const frames = useMemo(() => {
    const c = new Chess(demo.fen);
    const out = [{ fen: demo.fen, last: undefined as [string, string] | undefined, san: '' }];
    for (const m of demo.moves) {
      const mv = c.move(m);
      out.push({ fen: c.fen(), last: [mv.from, mv.to], san: mv.san });
    }
    return out;
  }, [demo]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!playing) return;
    if (i >= frames.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setI((x) => x + 1), reduced ? 2600 : 2200);
    return () => clearTimeout(t);
  }, [playing, i, frames.length, reduced]);

  const orientation = demo.orientation ?? (demo.fen.split(' ')[1] === 'b' ? 'black' : 'white');
  return (
    <div className="task-grid">
      <div className="task-board"><Board fen={frames[i].fen} orientation={orientation} lastMove={frames[i].last} label="Demonstration board" /></div>
      <div className="task-side">
        <div className="task-meta"><span className="pill">Demonstration</span><span className="pill subtle">Step {i} / {frames.length - 1}</span></div>
        <p className="caption" aria-live="polite">{i > 0 && <strong className="caption-move">{frames[i].san}</strong>}{demo.captions[i]}</p>
        <div className="row">
          <button className="btn ghost small" onClick={() => { setPlaying(false); setI(0); }} disabled={i === 0}>⏮ Start</button>
          <button className="btn ghost small" onClick={() => { setPlaying(false); setI((x) => Math.max(0, x - 1)); }} disabled={i === 0}>◀ Back</button>
          <button className="btn ghost small" onClick={() => setPlaying((p) => !p)} disabled={i >= frames.length - 1 && !playing}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <button className="btn small" onClick={() => { setPlaying(false); setI((x) => Math.min(frames.length - 1, x + 1)); }} disabled={i >= frames.length - 1}>Next ▶</button>
        </div>
      </div>
    </div>
  );
}

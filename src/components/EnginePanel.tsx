import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { engine, formatScore, checkMove, type Analysis, type MoveCheck } from '../engine/stockfish';
import type { MoveNode } from '../pgn/types';

export function pvToSan(fen: string, pv: string[], max = 8): string {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const uci of pv.slice(0, max)) {
    try {
      const fenParts = chess.fen().split(' ');
      const mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      out.push(fenParts[1] === 'w' ? `${fenParts[5]}.${mv.san}` : out.length === 0 ? `${fenParts[5]}...${mv.san}` : mv.san);
    } catch {
      break;
    }
  }
  return out.join(' ');
}

/** Live Stockfish analysis of one position. Clearly labelled as engine output. */
export function EnginePanel({ fen, onBestMove }: { fen: string; onBestMove?: (uci: string | null) => void }) {
  const [on, setOn] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnalysis(null);
    onBestMove?.(null);
    if (!on) return;
    let live = true;
    engine.cancelPending();
    engine
      .analyse(fen, {
        depth: 18,
        multipv: 3,
        onUpdate: (a) => live && setAnalysis(a),
      })
      .then((a) => {
        if (!live) return;
        setAnalysis(a);
        onBestMove?.(a.lines[0]?.pv[0] ?? null);
      })
      .catch((e) => live && String(e).includes('cancelled') === false && setError(String(e)));
    return () => {
      live = false;
    };
  }, [fen, on]);

  return (
    <div className="panel engine">
      <div className="panel-head">
        <span className="badge engine-badge">Engine</span>
        <strong>Stockfish analysis</strong>
        <label className="toggle">
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> {on ? 'On' : 'Off'}
        </label>
      </div>
      {error && <p className="err">Engine failed to start: {error}</p>}
      {on && !analysis && <p className="muted">Starting engine…</p>}
      {on && analysis && (
        <>
          <p className="muted small">{analysis.engine} · depth {analysis.depth}. Engine output only — it does not change your repertoire.</p>
          <ol className="pv-list">
            {analysis.lines.map((l) => (
              <li key={l.multipv}>
                <span className="score">{formatScore(l)}</span> <span className="pv">{pvToSan(fen, l.pv)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

const VERDICT_LABEL: Record<MoveCheck['verdict'], string> = {
  ok: 'Engine agrees (within 0.5)',
  inaccuracy: 'Engine: inaccuracy',
  mistake: 'Engine: mistake',
  blunder: 'Engine: blunder',
};

/** Checks every move of a line with Stockfish and reports disagreements. Read-only. */
export function LineVerifier({ nodes, side }: { nodes: MoveNode[]; side: 'w' | 'b' }) {
  const [results, setResults] = useState<Record<string, MoveCheck>>({});
  const [running, setRunning] = useState(false);
  const [scope, setScope] = useState<'ours' | 'all'>('ours');

  useEffect(() => setResults({}), [nodes]);

  const run = async () => {
    setRunning(true);
    setResults({});
    try {
      for (const n of nodes) {
        if (scope === 'ours' && n.color !== side) continue;
        const r = await checkMove(n.fenBefore, n.uci, 14);
        setResults((prev) => ({ ...prev, [n.id]: r }));
      }
    } catch {
      /* cancelled */
    }
    setRunning(false);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="badge engine-badge">Engine</span>
        <strong>Verify this line</strong>
        <select value={scope} onChange={(e) => setScope(e.target.value as 'ours' | 'all')} disabled={running}>
          <option value="ours">Our moves</option>
          <option value="all">All moves</option>
        </select>
        <button onClick={run} disabled={running}>{running ? 'Checking…' : 'Run check'}</button>
      </div>
      <p className="muted small">Depth 14. Results are shown next to your moves and never replace them.</p>
      <ul className="verify-list">
        {nodes.map((n) => {
          const r = results[n.id];
          if (!r) return null;
          return (
            <li key={n.id} className={`v-${r.verdict}`}>
              <b>{n.moveNumber}{n.color === 'w' ? '.' : '...'}{n.san}</b> — {VERDICT_LABEL[r.verdict]}
              {r.verdict !== 'ok' && (
                <> · engine prefers {pvToSan(n.fenBefore, r.best.pv, 1)} ({formatScore(r.best)} vs {formatScore(r.played)})</>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

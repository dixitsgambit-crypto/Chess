import { useState } from 'react';
import { Board } from './Board';
import { EnginePanel } from './EnginePanel';
import type { MoveNode } from '../pgn/types';
import { NAG_MEANING, NAG_SYMBOLS } from '../pgn/types';
import { formatLine, pathTo, positionKey } from '../pgn/parser';
import type { Chapter, Repertoire } from '../repertoire/build';
import { criticalKinds } from '../repertoire/build';
import type { UserNote } from '../lessons/notes';

/**
 * PGN-style tree: the main continuation inline, alternatives as indented blocks right after
 * the move they replace. `start` is rendered first, then its continuation.
 */
function MoveTree({ start, startAlts = [], selected, onSelect }: { start: MoveNode; startAlts?: MoveNode[]; selected: MoveNode; onSelect: (n: MoveNode) => void }) {
  const out: JSX.Element[] = [];
  const move = (n: MoveNode, forceNum: boolean) => (
    <span key={n.id} className={`mv ${n === selected ? 'sel' : ''} ${criticalKinds(n).length ? 'crit' : ''}`} onClick={() => onSelect(n)}>
      {(n.color === 'w' || forceNum) && <span className="num">{n.moveNumber}{n.color === 'w' ? '.' : '...'}</span>}
      {n.san}
      {n.nags.map((g) => NAG_SYMBOLS[g] ?? '').join('')}
      {(n.commentsAfter.length > 0 || n.commentsBefore.length > 0) && <sup>✎</sup>}
    </span>
  );
  const variations = (alts: MoveNode[]) =>
    alts.map((s) => (
      <div key={s.id + 'v'} className="variation">
        <MoveTree start={s} selected={selected} onSelect={onSelect} />
      </div>
    ));

  out.push(move(start, true));
  out.push(...variations(startAlts));
  let n = start;
  let afterVariation = startAlts.length > 0;
  while (n.children.length) {
    const [main, ...sides] = n.children;
    out.push(move(main, afterVariation));
    afterVariation = sides.length > 0;
    out.push(...variations(sides));
    n = main;
  }
  return <span className="tree">{out}</span>;
}

export function Explorer({
  rep,
  chapter,
  notes,
  onSaveNote,
  onOpenNode,
  initial,
}: {
  rep: Repertoire;
  chapter: Chapter;
  initial?: MoveNode;
  notes: Record<string, UserNote>;
  onSaveNote: (key: string, moves: string, text: string) => void;
  onOpenNode: (n: MoveNode) => void;
}) {
  const [selected, setSelected] = useState<MoveNode>(initial ?? chapter.game.root.children[0] ?? chapter.game.root);
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const node = selected.gameIndex === chapter.game.index ? selected : chapter.game.root.children[0] ?? chapter.game.root;
  const key = positionKey(node.fen);
  const note = notes[key];
  const anns = [...node.commentsBefore, ...node.commentsAfter];
  const others = (rep.byPosition.get(key) ?? []).filter((n) => n !== node && pathTo(n).map((p) => p.uci).join() !== pathTo(node).map((p) => p.uci).join());
  const kinds = criticalKinds(node);

  return (
    <div className="explorer">
      <div className="explorer-board">
        <Board
          fen={node.fen}
          orientation={rep.side === 'w' ? 'white' : 'black'}
          lastMove={node.uci ? [node.uci.slice(0, 2), node.uci.slice(2, 4)] : undefined}
          arrows={anns.flatMap((a) => a.arrows)}
          squares={anns.flatMap((a) => a.squares)}
          engineArrows={bestMove ? [{ from: bestMove.slice(0, 2), to: bestMove.slice(2, 4) }] : []}
        />
        <div className="nav-row">
          <button onClick={() => node.parent?.parent && setSelected(node.parent)}>◀</button>
          <button onClick={() => node.children[0] && setSelected(node.children[0])}>▶</button>
          <span className="muted small">Pale blue arrow = engine's best move (when analysis is on)</span>
        </div>
        <EnginePanel fen={node.fen} onBestMove={setBestMove} />
      </div>

      <div className="explorer-side">
        <div className="panel">
          <div className="panel-head"><strong>{chapter.title}</strong><span className="muted small">{chapter.eco} · {chapter.annotator}</span></div>
          {chapter.game.root.commentsAfter.map((c, i) => <p key={i} className="small intro-comment">{c.text}</p>)}
          <div className="tree-box">
            {chapter.game.root.children[0] && (
              <>
                <MoveTree start={chapter.game.root.children[0]} startAlts={chapter.game.root.children.slice(1)} selected={node} onSelect={setSelected} />
              </>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><strong>{formatLine(pathTo(node))}</strong></div>
          {kinds.length > 0 && <div className="tags">{kinds.map((k) => <span key={k} className={`tag tag-${k}`}>{k}</span>)}</div>}
          {node.nags.map((g) => <p key={g} className="src-pgn"><span className="badge">From your PGN</span> {NAG_SYMBOLS[g]} {NAG_MEANING[g] ?? ''}</p>)}
          {anns.filter((a) => a.text).map((a, i) => <p key={i} className="src-pgn"><span className="badge">From your PGN</span> {a.text}</p>)}
          {!anns.some((a) => a.text) && !note && <p className="muted small">No explanation in your material for this position.</p>}

          <div className="note-box">
            <div className="panel-head"><span className="badge notes-badge">Your notes</span></div>
            {draft === null ? (
              <>
                {note ? <p>{note.text}</p> : <p className="muted small">None yet.</p>}
                <button onClick={() => setDraft(note?.text ?? '')}>{note ? 'Edit note' : 'Add note'}</button>
              </>
            ) : (
              <>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} placeholder="Explain the idea in your own words (or paste an explanation you prepared)…" />
                <button className="primary" onClick={() => { onSaveNote(key, formatLine(pathTo(node)), draft); setDraft(null); }}>Save</button>
                <button onClick={() => setDraft(null)}>Cancel</button>
              </>
            )}
          </div>

          {others.length > 0 && (
            <div className="transpo">
              <strong className="small">Same position elsewhere in your repertoire:</strong>
              <ul>
                {others.map((o) => (
                  <li key={o.id}><a onClick={() => onOpenNode(o)}>{rep.chapterOf(o).title}: {formatLine(pathTo(o))}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Repertoire } from '../repertoire/build';
import { formatLine, pathTo, positionKey } from '../pgn/parser';
import { parseNotesImport, type UserNote } from '../lessons/notes';

const EXAMPLE = `@ 1.e4 e6 2.d4 d5 3.e5 Bd7
Explain the idea here in your own words.

@ 1.d4 e6 2.c4 f5 3.Nf3 Nf6 4.Nc3 Bb4
Another note…`;

export function NotesView({
  rep,
  notes,
  onImport,
  onSave,
  onDelete,
  focusKey,
}: {
  rep: Repertoire;
  notes: Record<string, UserNote>;
  onImport: (n: UserNote[]) => void;
  onSave: (key: string, moves: string, text: string) => void;
  onDelete: (key: string) => void;
  focusKey?: string;
}) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<{ ok: number; errors: string[] } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Questions in the user's file that have no written answer anywhere yet
  const open = rep.critical.filter((c) => c.kinds.includes('question') && !notes[positionKey(c.node.fen)]);
  const ordered = focusKey ? [...open].sort((a) => (positionKey(a.node.fen) === focusKey ? -1 : 0)) : open;

  const doImport = () => {
    const r = parseNotesImport(text);
    onImport(r.notes);
    setResult({ ok: r.notes.length, errors: r.errors });
  };

  const exportNotes = () => {
    const body = Object.values(notes).map((n) => `@ ${n.moves}\n${n.text}\n`).join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'academy-notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="notes-view">
      <section className="panel">
        <div className="panel-head"><strong>Open questions in your material</strong><span className="muted small">{open.length} without a written answer</span></div>
        <p className="muted small">
          These questions come from your PGN comments. The academy will not invent answers — write them here (or paste ones you prepared),
          and they will be used in lessons and quizzes.
        </p>
        <ul className="open-q">
          {ordered.map(({ node }) => {
            const key = positionKey(node.fen);
            const q = [...node.commentsBefore, ...node.commentsAfter].map((c) => c.text).find((t) => t.includes('?'));
            return (
              <li key={node.id} className={key === focusKey ? 'focus' : ''}>
                <div className="small muted">{rep.chapterOf(node).title} · {formatLine(pathTo(node))}</div>
                <div><b>{q}</b></div>
                <textarea rows={2} value={drafts[key] ?? ''} onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })} placeholder="Your answer…" />
                <button disabled={!drafts[key]?.trim()} onClick={() => onSave(key, formatLine(pathTo(node)), drafts[key].trim())}>Save answer</button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head"><strong>Import notes</strong></div>
        <p className="muted small">
          Paste explanations you wrote or prepared elsewhere. Each block starts with <code>@</code> and the moves from the starting position;
          moves are checked for legality before a note is attached.
        </p>
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} />
        <div className="row">
          <button className="primary" onClick={doImport} disabled={!text.trim()}>Import</button>
          <button onClick={exportNotes} disabled={!Object.keys(notes).length}>Export my notes</button>
        </div>
        {result && (
          <div className="small">
            <p className="ok">{result.ok} note(s) imported.</p>
            {result.errors.map((e, i) => <p key={i} className="err">{e}</p>)}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><strong>Your notes</strong><span className="muted small">{Object.keys(notes).length}</span></div>
        <ul className="note-list">
          {Object.values(notes).map((n) => (
            <li key={n.key}>
              <div className="small muted">{n.moves}{rep.byPosition.has(n.key) ? '' : ' · (position not in current repertoire)'}</div>
              <div>{n.text}</div>
              <button onClick={() => onDelete(n.key)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

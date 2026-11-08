import { useEffect, useMemo, useState } from 'react';
import { parsePgn } from './pgn/parser';
import type { MoveNode } from './pgn/types';
import { buildRepertoire, type Line } from './repertoire/build';
import { buildLessonScript, buildQuizzes } from './lessons/generate';
import { loadNotes, saveNotes, type UserNote } from './lessons/notes';
import { positionKey } from './pgn/parser';
import { Library } from './components/Library';
import { Theater } from './components/Theater';
import { Explorer } from './components/Explorer';
import { Practice } from './components/Practice';
import { Quizzes } from './components/Quizzes';
import { NotesView } from './components/NotesView';
import { CharacterSheet } from './components/CharacterSheet';
import { labSide, labSources, loadLab, setLabSide, setLabSources } from './academy/lab';
import { pushToast, useSession } from './academy/store';

type View = 'library' | 'lesson' | 'explore' | 'practice' | 'quizzes' | 'notes' | 'teacher';
interface Source { name: string; text: string; builtIn: boolean }

const BUILT_IN = 'blackmood.pgn';

/** Loads the player's laboratory data from the server before showing the studio. */
export default function OpeningLab() {
  const { user } = useSession();
  const [state, setState] = useState<'loading' | 'ready' | string>('loading');
  useEffect(() => {
    if (!user) return;
    setState('loading');
    loadLab(user.id).then(() => setState('ready'), (e: Error) => setState(e.message));
  }, [user?.id]);
  if (state === 'loading') return <div className="loading">Loading your laboratory…</div>;
  if (state !== 'ready') return <div className="empty"><p className="err">Could not load your laboratory: {state}</p></div>;
  return <Studio key={user!.id} />;
}

function Studio() {
  const [builtIn, setBuiltIn] = useState<Source | null>(null);
  const [uploaded, setUploaded] = useState<Source[]>(() => labSources().map((s) => ({ ...s, builtIn: false })));
  const [notes, setNotes] = useState<Record<string, UserNote>>(loadNotes);
  const [sideOverride, setSideOverride] = useState<string>(() => labSide());
  const [view, setView] = useState<View>('library');
  const [lineId, setLineId] = useState<string | null>(null);
  const [explore, setExplore] = useState<{ chapterId: string; node?: MoveNode } | null>(null);
  const [notesFocus, setNotesFocus] = useState<string | undefined>();

  useEffect(() => {
    fetch(`/repertoire/${BUILT_IN}`)
      .then((r) => r.text())
      .then((text) => setBuiltIn({ name: BUILT_IN, text, builtIn: true }));
  }, []);

  const sources = useMemo(() => [...(builtIn ? [builtIn] : []), ...uploaded], [builtIn, uploaded]);

  const rep = useMemo(() => {
    const games = sources.flatMap((s, i, all) => {
      const offset = all.slice(0, i).reduce((n, prev) => n + parsePgn(prev.text).length, 0);
      return parsePgn(s.text, offset);
    });
    const r = buildRepertoire(games);
    if (sideOverride === 'w' || sideOverride === 'b') r.side = sideOverride;
    return r;
  }, [sources, sideOverride]);

  const allLines = useMemo(() => rep.chapters.flatMap((c) => c.lines), [rep]);
  const line = allLines.find((l) => l.id === lineId) ?? allLines[0];
  const script = useMemo(() => (line ? buildLessonScript(rep, line, notes) : null), [rep, line, notes]);
  const quizzes = useMemo(() => buildQuizzes(rep, notes), [rep, notes]);

  const updateNotes = (next: Record<string, UserNote>) => {
    setNotes(next);
    saveNotes(next);
  };
  const saveNote = (key: string, moves: string, text: string) => {
    const next = { ...notes };
    if (text.trim()) next[key] = { key, moves, text: text.trim(), updated: Date.now() };
    else delete next[key];
    updateNotes(next);
  };

  const persist = (next: Source[]) => {
    setUploaded(next);
    setLabSources(next.map(({ name, text }) => ({ name, text })));
  };
  const onUpload = async (files: FileList) => {
    const next = [...uploaded];
    for (const f of Array.from(files)) {
      const text = await f.text();
      const same = next.find((u) => u.name === f.name);
      if (same?.text === text) continue; // identical file already present
      if (!parsePgn(text).some((g) => g.root.children.length)) { pushToast('info', `“${f.name}” contains no playable games and was not added.`); continue; }
      // never replace an existing repertoire: a different file with the same name is kept alongside
      let name = f.name;
      for (let i = 2; next.some((u) => u.name === name); i++) name = f.name.replace(/(\.pgn)?$/i, ` (${i})$1`);
      if (name !== f.name) pushToast('info', `A file called “${f.name}” already exists, so the new one was added as “${name}”.`);
      next.push({ name, text, builtIn: false });
    }
    persist(next);
  };
  const removeSource = (name: string) => {
    if (!window.confirm(`Remove “${name}” from your laboratory? Notes you wrote stay.`)) return;
    persist(uploaded.filter((u) => u.name !== name));
  };

  const openLesson = (l: Line) => { setLineId(l.id); setView('lesson'); };
  const openPractice = (l: Line) => { setLineId(l.id); setView('practice'); };
  const nextLine = () => {
    const i = allLines.findIndex((l) => l.id === line?.id);
    setLineId(allLines[(i + 1) % allLines.length].id);
  };

  if (!builtIn && !uploaded.length) return <div className="loading">Loading the repertoire…</div>;

  const explorerChapter = rep.chapters.find((c) => c.id === explore?.chapterId) ?? rep.chapters[0];
  const tabs: [View, string][] = [
    ['library', 'Courses'],
    ['lesson', 'Lesson video'],
    ['practice', 'Practice'],
    ['explore', 'Explorer'],
    ['quizzes', 'Quizzes'],
    ['notes', 'Notes & questions'],
    ['teacher', 'Teacher'],
  ];

  const lineSelect = (
    <select value={line?.id} onChange={(e) => setLineId(e.target.value)} className="line-select">
      {rep.chapters.map((c) => (
        <optgroup key={c.id} label={c.title}>
          {c.lines.map((l) => <option key={l.id} value={l.id}>{c.title} — {l.isMain ? 'Main line' : l.label}</option>)}
        </optgroup>
      ))}
    </select>
  );

  return (
    <div className="lab">
      <header className="lab-bar">
        <div className="lab-title">Repertoire studio</div>
        <nav>
          {tabs.map(([v, label]) => (
            <button key={v} className={view === v ? 'tab active' : 'tab'} onClick={() => setView(v)}>{label}</button>
          ))}
        </nav>
        <label className="small side-select">
          Side{' '}
          <select value={sideOverride} onChange={(e) => { setSideOverride(e.target.value); setLabSide(e.target.value as 'auto' | 'w' | 'b'); }}>
            <option value="auto">Auto ({rep.side === 'w' ? 'White' : 'Black'})</option>
            <option value="w">White</option>
            <option value="b">Black</option>
          </select>
        </label>
      </header>

      <div className="lab-main">
        {view === 'library' && (
          <Library
            rep={rep}
            sources={sources}
            onLesson={openLesson}
            onPractice={openPractice}
            onExplore={(id) => { setExplore({ chapterId: id }); setView('explore'); }}
            onUpload={onUpload}
            onRemoveSource={removeSource}
          />
        )}
        {view === 'lesson' && script && (
          <>
            <div className="row">{lineSelect}</div>
            <Theater script={script} side={rep.side} onPractice={() => setView('practice')} />
          </>
        )}
        {view === 'practice' && line && (
          <>
            <div className="row">{lineSelect}</div>
            <Practice rep={rep} line={line} onNextLine={nextLine} />
          </>
        )}
        {view === 'explore' && explorerChapter && (
          <>
            <div className="row">
              <select value={explorerChapter.id} onChange={(e) => setExplore({ chapterId: e.target.value })}>
                {rep.chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <Explorer
              key={explorerChapter.id + (explore?.node?.id ?? '')}
              rep={rep}
              chapter={explorerChapter}
              initial={explore?.node}
              notes={notes}
              onSaveNote={saveNote}
              onOpenNode={(n) => setExplore({ chapterId: rep.chapterOf(n).id, node: n })}
            />
          </>
        )}
        {view === 'quizzes' && (
          <Quizzes quizzes={quizzes} side={rep.side} onAnswer={(q) => { setNotesFocus(positionKey(q.node.fen)); setView('notes'); }} />
        )}
        {view === 'notes' && (
          <NotesView
            rep={rep}
            notes={notes}
            focusKey={notesFocus}
            onSave={saveNote}
            onDelete={(k) => saveNote(k, '', '')}
            onImport={(list) => updateNotes({ ...notes, ...Object.fromEntries(list.map((n) => [n.key, n])) })}
          />
        )}
        {view === 'teacher' && <CharacterSheet />}
      </div>
    </div>
  );
}

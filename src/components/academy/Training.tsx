import { useEffect, useMemo, useState } from 'react';
import { allTasks, type TaskRef } from '../../academy/content';
import { dueReviews, recordRush, useStore } from '../../academy/store';
import { href } from '../../academy/router';
import { PageHead } from './Shell';
import { TaskSequence } from './TaskSequence';
import { TaskRunner } from './TaskRunner';
import type { Task } from '../../content/schema';

/** Practice pool: lesson practice positions only — never examination or guardian positions. */
const practicePool = (): TaskRef[] => allTasks().filter((r) => (r.stage === 'guided' || r.stage === 'independent' || r.stage === 'application') && r.task.kind === 'puzzle');

export function Training({ tab }: { tab?: string }) {
  const t = tab === 'drills' || tab === 'rush' ? tab : 'review';
  const s = useStore();
  const due = dueReviews(s).length;
  return (
    <div>
      <PageHead eyebrow="Training Grounds" title="Training Grounds">Spaced revision keeps what you learned. Theme drills sharpen one pattern. Puzzle Rush tests speed.</PageHead>
      <div className="tabs" role="tablist">
        <a role="tab" aria-selected={t === 'review'} className={`tab ${t === 'review' ? 'on' : ''}`} href={href('training/review')}>Revision {due > 0 && <span className="count">{due}</span>}</a>
        <a role="tab" aria-selected={t === 'drills'} className={`tab ${t === 'drills' ? 'on' : ''}`} href={href('training/drills')}>Theme drills</a>
        <a role="tab" aria-selected={t === 'rush'} className={`tab ${t === 'rush' ? 'on' : ''}`} href={href('training/rush')}>Puzzle Rush</a>
      </div>
      {t === 'review' && <Review />}
      {t === 'drills' && <Drills />}
      {t === 'rush' && <Rush />}
    </div>
  );
}

function Review() {
  const s = useStore();
  const [session, setSession] = useState<Task[] | null>(null);
  const [done, setDone] = useState<{ ok: number; n: number } | null>(null);
  const index = useMemo(() => new Map(allTasks().map((r) => [r.task.id, r.task])), []);
  const due = dueReviews(s).map((id) => index.get(id)).filter((t): t is Task => !!t);
  const upcoming = Object.entries(s.items).filter(([, r]) => r.srs && r.srs.due > Date.now()).sort((a, b) => a[1].srs!.due - b[1].srs!.due).slice(0, 8);

  if (session) return <TaskSequence tasks={session} assess review finishLabel="Finish review" onFinish={(rs) => { setDone({ ok: rs.filter((r) => r.outcome.correct).length, n: rs.length }); setSession(null); }} />;
  return (
    <div className="grid-2">
      <section className="card">
        <h2 className="card-title">Due now</h2>
        {done && <p className="ok">Last session: {done.ok}/{done.n} retained.</p>}
        {due.length ? (
          <>
            <p className="big-number">{due.length}</p>
            <p className="muted">One attempt each, no hints. Correct answers push the next review further out; misses return tomorrow.</p>
            <button className="btn primary" onClick={() => { setDone(null); setSession(due.slice(0, 15)); }}>Start review ({Math.min(15, due.length)})</button>
          </>
        ) : <p className="muted">Nothing is due. Solve positions in lessons and they will be scheduled here — first after a day, then at growing intervals.</p>}
      </section>
      <section className="card">
        <h2 className="card-title">Coming up</h2>
        {upcoming.length ? <ul className="review-list">{upcoming.map(([id, r]) => <li key={id}><span>{index.get(id)?.prompt ?? id}</span><span className="small muted">{new Date(r.srs!.due).toLocaleDateString()}</span></li>)}</ul> : <p className="muted">No reviews scheduled yet.</p>}
      </section>
    </div>
  );
}

function Drills() {
  const pool = useMemo(practicePool, []);
  const themes = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of pool) for (const t of r.task.themes) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  }, [pool]);
  const [theme, setTheme] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const [finished, setFinished] = useState(false);
  if (theme) {
    const refs = pool.filter((r) => r.task.themes.includes(theme));
    return (
      <div>
        <div className="row"><button className="btn ghost small" onClick={() => { setTheme(null); setFinished(false); }}>← All themes</button><strong>Theme: {theme}</strong></div>
        {finished ? (
          <div className="stage-summary"><h3>Drill complete</h3><p className="muted">Positions you had already solved earn no further XP — drills are for sharpening, revision is for retention.</p><div className="row"><button className="btn primary" onClick={() => { setKey((k) => k + 1); setFinished(false); }}>Drill again</button></div></div>
        ) : (
          <DrillRun key={key + theme} refs={refs} onFinish={() => setFinished(true)} />
        )}
      </div>
    );
  }
  return (
    <div className="theme-grid">
      {themes.map(([t, n]) => <button key={t} className="theme-card" onClick={() => setTheme(t)}><span className="theme-name">{t}</span><span className="muted small">{n} positions</span></button>)}
    </div>
  );
}

function DrillRun({ refs, onFinish }: { refs: TaskRef[]; onFinish: () => void }) {
  // the server records each position under its own lesson stage, so the XP rules stay consistent
  const [i, setI] = useState(0);
  const r = refs[i];
  return (
    <TaskSequence key={r.task.id} tasks={[r.task]} finishLabel={i + 1 < refs.length ? 'Next position' : 'Finish drill'}
      onFinish={() => (i + 1 < refs.length ? setI(i + 1) : onFinish())} />
  );
}

const RUSH_SECONDS = 180;

function Rush() {
  const s = useStore();
  const [run, setRun] = useState<{ queue: Task[]; i: number; score: number; misses: number; ends: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [last, setLast] = useState<number | null>(null);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [run]);
  const left = run ? Math.max(0, Math.ceil((run.ends - now) / 1000)) : RUSH_SECONDS;
  const over = !!run && (left === 0 || run.misses >= 3 || run.i >= run.queue.length);
  useEffect(() => {
    if (run && over) { recordRush(run.score); setLast(run.score); setRun(null); }
  }, [over]);

  const start = () => {
    const q = practicePool().map((r) => r.task).sort(() => Math.random() - 0.5);
    setLast(null);
    setRun({ queue: q, i: 0, score: 0, misses: 0, ends: Date.now() + RUSH_SECONDS * 1000 });
  };

  if (!run) return (
    <section className="card narrow">
      <h2 className="card-title">Puzzle Rush</h2>
      <p>Three minutes, three lives. Solve as many lesson practice positions as you can — one try each.</p>
      <p className="muted small">Every answer is refereed like any practice attempt: a position you solve here for the first time earns its normal XP, a miss counts as a miss, and repeats earn nothing. Your best score is kept.</p>
      {last !== null && <p className="big-number">{last}</p>}
      <p>Personal best: <strong>{s.counters.rushBest ?? 0}</strong></p>
      <button className="btn primary lg" onClick={start}>Start</button>
    </section>
  );
  const task = run.queue[run.i];
  return (
    <div>
      <div className="rush-bar"><span>⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span><span>Score {run.score}</span><span>Lives {'♥'.repeat(3 - run.misses)}{'♡'.repeat(run.misses)}</span></div>
      {task && <TaskRunner key={task.id + run.i} task={task} oneTry onDone={(o) => setTimeout(() => setRun((r) => r && { ...r, i: r.i + 1, score: r.score + (o.correct ? 1 : 0), misses: r.misses + (o.correct ? 0 : 1) }), o.correct ? 500 : 1400)} />}
    </div>
  );
}

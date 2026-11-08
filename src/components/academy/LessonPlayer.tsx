import { useEffect, useMemo, useState } from 'react';
import { ALL_LESSONS, kingdomById, lessonById } from '../../academy/content';
import { assessmentOpen, markStage, useStore, type State } from '../../academy/store';
import { go, href } from '../../academy/router';
import { DemoBoard } from './DemoBoard';
import { TaskSequence, type SeqResult } from './TaskSequence';
import type { Lesson, Task } from '../../content/schema';

const STAGES = [
  { id: 'intro', label: 'Introduction', n: 'I' },
  { id: 'concept', label: 'Concept', n: 'II' },
  { id: 'demo', label: 'Demonstration', n: 'III' },
  { id: 'guided', label: 'Guided practice', n: 'IV' },
  { id: 'independent', label: 'Independent practice', n: 'V' },
  { id: 'application', label: 'Practical application', n: 'VI' },
  { id: 'exam', label: 'Examination', n: 'VII' },
  { id: 'results', label: 'Mastery & revision', n: 'VIII' },
] as const;
type StageId = (typeof STAGES)[number]['id'];

export function lessonStatus(s: State, l: Lesson): 'mastered' | 'tested-out' | 'in-progress' | 'new' {
  const rec = s.lessons[l.id];
  if (rec?.mastered) return 'mastered';
  if (rec?.testedOut) return 'tested-out';
  if (rec?.stages.length || [...l.guided, ...l.independent, ...l.exam].some((t) => s.items[t.id])) return 'in-progress';
  return 'new';
}

export function LessonPlayer({ id, stage }: { id: string; stage?: string }) {
  const lesson = lessonById(id);
  const s = useStore();
  const current = (STAGES.find((x) => x.id === stage)?.id ?? 'intro') as StageId;
  useEffect(() => { if (lesson) markStage(lesson.id, current); }, [lesson, current]);
  if (!lesson) return <NotFound />;
  const kingdom = kingdomById(lesson.kingdom)!;
  const idx = STAGES.findIndex((x) => x.id === current);
  const nextStage = STAGES[idx + 1]?.id;
  const goStage = (st: StageId) => go(`lesson/${lesson.id}/${st}`);
  const status = lessonStatus(s, lesson);

  return (
    <div className="lesson">
      <nav className="crumbs"><a href={href('academy')}>Academy</a> › <a href={href(`kingdom/${kingdom.id}`)}>{kingdom.name}</a> › <span>{lesson.title}</span></nav>
      <header className="lesson-head">
        <div>
          <p className="eyebrow">{kingdom.emblem} {kingdom.name}</p>
          <h1>{lesson.title}</h1>
          <p className="muted">{lesson.summary}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      <ol className="stepper" aria-label="Lesson stages">
        {STAGES.map((st, k) => (
          <li key={st.id} className={`${st.id === current ? 'now' : ''} ${s.lessons[lesson.id]?.stages.includes(st.id) ? 'seen' : ''}`}>
            <button onClick={() => goStage(st.id)} aria-current={st.id === current ? 'step' : undefined}>
              <span className="step-n">{st.n}</span><span className="step-label">{st.label}</span>
            </button>
            {k < STAGES.length - 1 && <span className="step-line" aria-hidden />}
          </li>
        ))}
      </ol>

      <section className="stage-panel">
        {current === 'intro' && (
          <div className="prose">
            <p className="lead">{lesson.intro}</p>
            <h3>Objectives</h3>
            <ul className="objectives">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            <h3>Topics</h3>
            <p>{lesson.topics.join(' · ')}</p>
            {lesson.prerequisites.length > 0 && <p className="small muted">Builds on: {lesson.prerequisites.map((p) => lessonById(p)?.title).join(', ')}</p>}
            <div className="row">
              <button className="btn primary" onClick={() => goStage('concept')}>Begin the lesson</button>
              <button className="btn ghost" onClick={() => goStage('exam')} title="Already know this? The examination alone can master it.">Test out — go straight to the examination</button>
            </div>
            {status === 'tested-out' && <p className="small muted">Your placement assessment suggests you already know this. The examination will confirm it.</p>}
          </div>
        )}
        {current === 'concept' && (
          <div className="prose">
            {lesson.concept.map((p, i) => <p key={i}>{p}</p>)}
            <button className="btn primary" onClick={() => goStage('demo')}>See it on the board</button>
          </div>
        )}
        {current === 'demo' && (
          <>
            <DemoBoard demo={lesson.demo} />
            <div className="row end"><button className="btn primary" onClick={() => goStage('guided')}>Guided practice</button></div>
          </>
        )}
        {(current === 'guided' || current === 'independent' || current === 'application') && (
          <PracticeStage key={current} lesson={lesson} stage={current} onDone={() => nextStage && goStage(nextStage)} />
        )}
        {current === 'exam' && <ExamStage key={lesson.id} lesson={lesson} onDone={() => goStage('results')} />}
        {current === 'results' && <Results lesson={lesson} />}
      </section>
    </div>
  );
}

const STAGE_TEXT = {
  guided: 'Hints are free here and you can try as often as you like. Guided work earns only a little XP.',
  independent: 'On your own now. Hints are available but reduce XP; your first attempt matters most.',
  application: 'Use the idea in a practical setting. Full XP for a first, hint-free success.',
} as const;

function PracticeStage({ lesson, stage, onDone }: { lesson: Lesson; stage: 'guided' | 'independent' | 'application'; onDone: () => void }) {
  const [finished, setFinished] = useState<SeqResult[] | null>(null);
  if (finished) {
    const ok = finished.filter((r) => r.outcome.correct).length;
    return (
      <div className="stage-summary">
        <h3>{ok} of {finished.length} solved</h3>
        <p className="muted">{ok < finished.length ? 'Skipped or missed positions come back in your revision queue once you solve them.' : 'Well done.'}</p>
        <div className="row"><button className="btn ghost" onClick={() => setFinished(null)}>Practise this stage again</button><button className="btn primary" onClick={onDone}>Next stage</button></div>
      </div>
    );
  }
  return (
    <>
      <p className="stage-note">{STAGE_TEXT[stage]}</p>
      <TaskSequence tasks={lesson[stage]} onFinish={setFinished} finishLabel="Finish stage" />
    </>
  );
}

function ExamStage({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const s = useStore();
  const now = Date.now();
  // snapshot which positions are open when the exam starts
  const [plan] = useState(() => {
    const open: Task[] = [], cooling: { task: Task; until: number }[] = [];
    for (const t of lesson.exam) {
      if (s.items[t.id]?.credited) continue;
      const o = assessmentOpen(s, t.id, now);
      if (o.open) open.push(t); else cooling.push({ task: t, until: o.until! });
    }
    return { open, cooling };
  });
  const [started, setStarted] = useState(false);
  const credited = lesson.exam.filter((t) => s.items[t.id]?.credited).length;

  if (s.lessons[lesson.id]?.mastered) return (
    <div className="stage-summary"><h3>✦ Mastered</h3><p className="muted">Every examination position is credited. Revisions will keep it fresh.</p><button className="btn primary" onClick={onDone}>See your report</button></div>
  );
  if (!started) return (
    <div className="prose">
      <p className="lead">{lesson.exam.length} unseen positions. One attempt each, no hints.</p>
      <p>Mastery needs credit on every examination position. A position you miss can be credited only after a gap of at least 20 hours — proof that you have retained the idea, not just memorised the answer.</p>
      <p>Credited so far: <strong>{credited} / {lesson.exam.length}</strong></p>
      {plan.cooling.length > 0 && (
        <div className="cooling">
          <strong>Resting positions</strong>
          <ul>{plan.cooling.map((c) => <li key={c.task.id}>{c.task.prompt} — available again {new Date(c.until).toLocaleString()}</li>)}</ul>
        </div>
      )}
      {plan.open.length ? <button className="btn primary" onClick={() => setStarted(true)}>Begin examination ({plan.open.length} position{plan.open.length > 1 ? 's' : ''})</button>
        : <p className="muted">No positions are open right now. Come back when the resting positions are available, or keep practising in the Training Grounds.</p>}
    </div>
  );
  return (
    <TaskSequence tasks={plan.open} assess finishLabel="See results" onFinish={onDone} />
  );
}

function Results({ lesson }: { lesson: Lesson }) {
  const s = useStore();
  const rec = s.lessons[lesson.id];
  const all = [...lesson.guided, ...lesson.independent, ...lesson.application, ...lesson.exam];
  const byObjective = useMemo(() => {
    const m = new Map<string, { total: number; solved: number; first: number }>();
    for (const t of all) {
      const e = m.get(t.objective) ?? { total: 0, solved: 0, first: 0 };
      e.total++;
      const r = s.items[t.id];
      if (r?.solved) e.solved++;
      if (r?.firstCorrect) e.first++;
      m.set(t.objective, e);
    }
    return [...m.entries()];
  }, [s.items, lesson.id]);
  const examCredited = lesson.exam.filter((t) => s.items[t.id]?.credited).length;
  const reviews = all.map((t) => ({ t, r: s.items[t.id] })).filter((x) => x.r?.srs).sort((a, b) => a.r!.srs!.due - b.r!.srs!.due);
  const idx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
  const next = ALL_LESSONS[idx + 1];
  const weakest = byObjective.filter(([, v]) => v.total && v.first / v.total < 0.5).map(([k]) => k);

  return (
    <div className="results">
      <div className={`mastery-card ${rec?.mastered ? 'mastered' : ''}`}>
        <div className="mastery-emblem">{rec?.mastered ? '✦' : '◇'}</div>
        <div>
          <h3>{rec?.mastered ? 'Lesson mastered' : 'Not yet mastered'}</h3>
          <p className="muted">Examination credit: {examCredited} / {lesson.exam.length}{rec?.examBest ? ` · highest credit ${rec.examBest}%` : ''}</p>
          {!rec?.mastered && <p className="small">Mastery needs credit on every examination position. Missed positions can be retried after 20 hours.</p>}
        </div>
      </div>
      <h3>Feedback by objective</h3>
      <table className="table">
        <thead><tr><th>Objective</th><th>Solved</th><th>First-attempt</th></tr></thead>
        <tbody>{byObjective.map(([o, v]) => <tr key={o}><td>{o}</td><td>{v.solved}/{v.total}</td><td><Meter value={v.total ? v.first / v.total : 0} /></td></tr>)}</tbody>
      </table>
      {weakest.length > 0 && <p className="small">Focus next on: <strong>{weakest.join('; ')}</strong>.</p>}
      <h3>Revision schedule</h3>
      {reviews.length ? (
        <ul className="review-list">{reviews.map(({ t, r }) => <li key={t.id}><span>{t.prompt}</span><span className="muted small">{r!.srs!.due <= Date.now() ? 'due now' : new Date(r!.srs!.due).toLocaleDateString()}</span></li>)}</ul>
      ) : <p className="muted">Positions you solve on your own are scheduled here for spaced revision.</p>}
      <div className="row">
        <a className="btn ghost" href={href('training/review')}>Open revision queue</a>
        {next && <a className="btn primary" href={href(`lesson/${next.id}/intro`)}>Next lesson: {next.title}</a>}
      </div>
    </div>
  );
}

export function Meter({ value }: { value: number }) {
  return <span className="meter" role="meter" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.round(value * 100)}%` }} /></span>;
}

export function StatusBadge({ status }: { status: ReturnType<typeof lessonStatus> }) {
  const label = { mastered: '✦ Mastered', 'tested-out': '⚖ Tested out', 'in-progress': '◐ In progress', new: '○ Not started' }[status];
  return <span className={`status status-${status}`}>{label}</span>;
}

export function NotFound() {
  return <div className="empty"><h2>Lost in the fog</h2><p className="muted">This page does not exist.</p><a className="btn primary" href={href('home')}>Return home</a></div>;
}

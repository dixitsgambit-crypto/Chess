import { useState } from 'react';
import { KINGDOMS, PLACEMENT, kingdomById } from '../../academy/content';
import { assessmentOpen, completePlacement, openedBy, useStore, type PlacementRec } from '../../academy/store';
import { href } from '../../academy/router';
import { PageHead } from './Shell';
import { lessonStatus, Meter, NotFound, StatusBadge } from './LessonPlayer';
import { TaskSequence } from './TaskSequence';
import type { Kingdom, Task } from '../../content/schema';

export function AcademyView() {
  const s = useStore();
  return (
    <div>
      <PageHead eyebrow="Curriculum" title="Chess Academy">
        Learn → Understand → Practise → Apply → Master. Every lesson ends in an examination of unseen positions; mastery is never awarded for reading alone.
      </PageHead>
      {!s.placement && (
        <div className="callout">
          <div><strong>Not a beginner?</strong> Take the placement assessment: 10 unseen positions that let you test out of what you already know.</div>
          <a className="btn primary" href={href('placement')}>Start placement</a>
        </div>
      )}
      <div className="kingdom-list">
        {KINGDOMS.map((k) => <KingdomCard key={k.id} k={k} />)}
      </div>
    </div>
  );
}

function KingdomCard({ k }: { k: Kingdom }) {
  const s = useStore();
  const open = s.unlocked.includes(k.id);
  const mastered = k.lessons.filter((l) => s.lessons[l.id]?.mastered).length;
  return (
    <a className={`kingdom-card ${open ? '' : 'sealed'}`} href={href(`kingdom/${k.id}`)}>
      <span className="kc-emblem" aria-hidden>{k.emblem}</span>
      <span className="kc-body">
        <span className="kc-order">Kingdom {k.order}</span>
        <span className="kc-name">{k.name}</span>
        <span className="kc-epithet">{k.epithet}</span>
        <span className="kc-meta">
          {k.lessons.length ? <>{mastered}/{k.lessons.length} lessons mastered · {k.topics.length} topics</> : <>{k.topics.length} topics · curriculum in preparation</>}
          {s.bosses[k.id]?.defeated && ' · Guardian defeated'}
          {!open && k.lessons.length > 0 && ' · Sealed'}
        </span>
      </span>
      {k.lessons.length > 0 && <Meter value={k.lessons.length ? mastered / k.lessons.length : 0} />}
    </a>
  );
}

export function KingdomView({ id }: { id: string }) {
  const s = useStore();
  const k = kingdomById(id);
  if (!k) return <NotFound />;
  const open = s.unlocked.includes(k.id);
  const covered = new Set(k.lessons.flatMap((l) => l.topics));
  const gate = kingdomById(openedBy(k.id) ?? '');
  return (
    <div>
      <nav className="crumbs"><a href={href('academy')}>Academy</a> › <span>{k.name}</span></nav>
      <PageHead eyebrow={`Kingdom ${k.order} · ${k.epithet}`} title={`${k.emblem} ${k.name}`}>{k.description}</PageHead>
      {!open && k.lessons.length > 0 && (
        <div className="callout warn">
          <div><strong>Sealed.</strong> {gate?.boss ? <>Defeat {gate.boss.name} of the <a href={href(`kingdom/${gate.id}`)}>{gate.name}</a> to open this gate.</> : 'This gate opens later in your journey.'}{k.id === 'tactics' || k.id === 'endgames' ? ' Passing the Foundation part of the placement assessment also opens it.' : ''} You may still study these lessons now.</div>
        </div>
      )}
      {k.lessons.length > 0 ? (
        <ol className="lesson-list">
          {k.lessons.map((l, i) => {
            const st = lessonStatus(s, l);
            return (
              <li key={l.id}>
                <a href={href(`lesson/${l.id}/intro`)} className="lesson-row">
                  <span className="lr-n">{i + 1}</span>
                  <span className="lr-body"><span className="lr-title">{l.title}</span><span className="lr-sum">{l.summary}</span><span className="lr-topics">{l.topics.join(' · ')}</span></span>
                  <StatusBadge status={st} />
                </a>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="callout"><div><strong>Curriculum in preparation.</strong> This kingdom’s lessons are not published yet: every position must be verified before release.</div></div>
      )}
      {k.boss && (
        <section className={`boss-card ${s.bosses[k.id]?.defeated ? 'won' : ''}`}>
          <div className="boss-emblem" aria-hidden>⚔</div>
          <div>
            <h2>Guardian: {k.boss.name}</h2>
            <p className="muted">{k.boss.intro}</p>
            {s.bosses[k.id]?.defeated ? <p className="ok">Defeated {new Date(s.bosses[k.id]!.at!).toLocaleDateString()}.</p> : <a className="btn primary" href={href(`boss/${k.id}`)}>Challenge the guardian</a>}
          </div>
        </section>
      )}
      <section className="card">
        <h2 className="card-title">Topics of this kingdom</h2>
        <ul className="topic-cloud">{k.topics.map((t) => <li key={t} className={covered.has(t) ? 'covered' : ''}>{t}</li>)}</ul>
        <p className="small muted">Highlighted topics are taught in the published lessons; the rest are on the roadmap.</p>
      </section>
    </div>
  );
}

export function BossBattle({ id }: { id: string }) {
  const s = useStore();
  const k = kingdomById(id);
  const [phase, setPhase] = useState<'intro' | 'fight' | 'result'>('intro');
  const [plan] = useState(() => {
    const now = Date.now();
    const open: Task[] = [], cooling: Task[] = [];
    for (const t of k?.boss?.tasks ?? []) {
      if (s.items[t.id]?.credited) continue;
      if (assessmentOpen(s, t.id, now).open) open.push(t); else cooling.push(t);
    }
    return { open, cooling };
  });
  if (!k?.boss) return <NotFound />;
  const credited = k.boss.tasks.filter((t) => s.items[t.id]?.credited).length;
  // the server evaluates the battle after every position; the result is read from state
  const res = { defeated: !!s.bosses[k.id]?.defeated, pct: Math.round((credited / k.boss.tasks.length) * 100) };

  return (
    <div>
      <nav className="crumbs"><a href={href('academy')}>Academy</a> › <a href={href(`kingdom/${k.id}`)}>{k.name}</a> › <span>{k.boss.name}</span></nav>
      <PageHead eyebrow="Guardian battle" title={k.boss.name}>{k.boss.intro}</PageHead>
      {phase === 'intro' && (
        <div className="prose">
          <p>Credited so far: <strong>{credited}/{k.boss.tasks.length}</strong>. One attempt per position, no hints. Positions you miss rest for 20 hours before they can be retried.</p>
          {plan.cooling.length > 0 && <p className="small muted">{plan.cooling.length} position{plan.cooling.length > 1 ? 's are' : ' is'} resting.</p>}
          {s.bosses[k.id]?.defeated ? <p className="ok">You have already defeated this guardian.</p>
            : plan.open.length ? <button className="btn primary lg" onClick={() => setPhase('fight')}>Enter the battle ({plan.open.length})</button>
              : <p className="muted">No positions are open right now — return when the resting positions are ready.</p>}
        </div>
      )}
      {phase === 'fight' && <TaskSequence tasks={plan.open} assess finishLabel="Face the verdict" onFinish={() => setPhase('result')} />}
      {phase === 'result' && (
        <div className={`mastery-card ${res.defeated ? 'mastered' : ''}`}>
          <div className="mastery-emblem">{res.defeated ? '⚑' : '⚔'}</div>
          <div>
            <h3>{res.defeated ? `${k.boss.name} is defeated!` : 'The guardian stands'}</h3>
            <p className="muted">Credited {res.pct}% — 80% needed.</p>
            <a className="btn primary" href={href(`kingdom/${k.id}`)}>Return to {k.name}</a>
          </div>
        </div>
      )}
    </div>
  );
}

export function Placement() {
  const s = useStore();
  const [phase, setPhase] = useState<'intro' | 'test' | 'done'>(s.placement ? 'done' : 'intro');
  const [result, setResult] = useState<PlacementRec | undefined>(s.placement);
  return (
    <div>
      <PageHead eyebrow="Placement" title="Placement Assessment">Ten unseen positions across the Foundation Realm, the Tactical Kingdom and the Endgame Citadel. No hints, one attempt each, no XP — this only finds your starting point.</PageHead>
      {phase === 'intro' && <button className="btn primary lg" onClick={() => setPhase('test')}>Begin</button>}
      {phase === 'test' && (
        <TaskSequence tasks={PLACEMENT.map((p) => p.task)} assess finishLabel="See my placement"
          onFinish={async () => { const p = await completePlacement(); if (p) { setResult(p); setPhase('done'); } }} />
      )}
      {phase === 'done' && result && (
        <div className="results">
          <div className="mastery-card mastered">
            <div className="mastery-emblem">⚖</div>
            <div>
              <h3>Recommended start: {kingdomById(result.recommended)?.name}</h3>
              <p className="muted">Taken {new Date(result.at).toLocaleDateString()}</p>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Area</th><th>Score</th></tr></thead>
            <tbody>{Object.entries(result.scores).map(([kid, sc]) => <tr key={kid}><td>{kingdomById(kid)?.name}</td><td>{sc.correct}/{sc.total}</td></tr>)}</tbody>
          </table>
          {result.testedOut.length > 0 ? <p>Tested out of {result.testedOut.length} lesson{result.testedOut.length > 1 ? 's' : ''}. They are marked ⚖ and remain open; take their examinations to master them.</p> : <p>No lessons tested out — start at the beginning; you will move quickly through what you know.</p>}
          <div className="row"><a className="btn primary" href={href(`kingdom/${result.recommended}`)}>Go to {kingdomById(result.recommended)?.name}</a></div>
        </div>
      )}
    </div>
  );
}

import { KINGDOMS, ALL_LESSONS } from '../../academy/content';
import { currentWeek, dailyMissions, dueReviews, levelFor, streak, titleFor, today, useStore, weeklyMissions } from '../../academy/store';
import { href } from '../../academy/router';
import { lessonStatus } from './LessonPlayer';
import { KingdomMapArt } from './KingdomMap';

export function Home() {
  const s = useStore();
  const level = levelFor(s.xp);
  const fresh = s.xp === 0 && !s.placement && !Object.keys(s.items).length;
  const next = ALL_LESSONS.find((l) => { const st = lessonStatus(s, l); return st !== 'mastered' && st !== 'tested-out' && s.unlocked.includes(l.kingdom); }) ?? ALL_LESSONS[0];
  const due = dueReviews(s);
  const daily = dailyMissions();
  const weekly = weeklyMissions();
  const empty = { progress: {} as Record<string, number>, claimed: [] as string[] };
  const dailyBox = s.daily.date === today() ? s.daily : empty;
  const weeklyBox = s.weekly.week === currentWeek() ? s.weekly : empty;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-art" aria-hidden><KingdomMapArt compact /></div>
        <div className="hero-copy">
          <p className="eyebrow">Chessverse Academy</p>
          <h1>{fresh ? 'The Complete Journey of a Chess Player' : `Welcome back, ${s.profile.name}`}</h1>
          <p className="lead">{fresh
            ? 'Learn, understand, practise, apply, master. Ten kingdoms take you from your first move to tournament-level understanding — and every milestone must be earned on the board.'
            : `${titleFor(level).title} · Level ${level} · ${streak(s)}-day streak`}</p>
          <div className="row">
            <a className="btn primary lg" href={href(`lesson/${next.id}/intro`)}>{fresh ? 'Begin with the Foundation Realm' : `Continue: ${next.title}`}</a>
            {!s.placement && <a className="btn ghost lg" href={href('placement')}>Take the placement assessment</a>}
          </div>
          {fresh && <p className="small muted">Already play? The 10-position placement assessment lets you test out of lessons you know — they stay open for review.</p>}
        </div>
      </section>

      <div className="grid-3">
        <section className="card">
          <h2 className="card-title">Daily missions</h2>
          <ul className="missions">
            {daily.map((m) => {
              const p = Math.min(m.target, dailyBox.progress[m.id] ?? 0);
              const done = dailyBox.claimed.includes(m.id);
              return <li key={m.id} className={done ? 'done' : ''}><span>{done ? '✓ ' : ''}{m.label}</span><span className="mission-p">{p}/{m.target}</span></li>;
            })}
          </ul>
          <p className="small muted">+25 XP each. Missions only count demonstrated skill.</p>
        </section>
        <section className="card">
          <h2 className="card-title">Weekly challenges</h2>
          <ul className="missions">
            {weekly.map((m) => {
              const p = Math.min(m.target, weeklyBox.progress[m.id] ?? 0);
              const done = weeklyBox.claimed.includes(m.id);
              return <li key={m.id} className={done ? 'done' : ''}><span>{done ? '✓ ' : ''}{m.label}</span><span className="mission-p">{p}/{m.target}</span></li>;
            })}
          </ul>
          <p className="small muted">+100 XP each.</p>
        </section>
        <section className="card">
          <h2 className="card-title">Revision</h2>
          {due.length ? (
            <>
              <p className="big-number">{due.length}</p>
              <p className="muted">position{due.length > 1 ? 's' : ''} due for spaced review.</p>
              <a className="btn primary" href={href('training/review')}>Review now</a>
            </>
          ) : (
            <p className="muted">Nothing due. Positions you solve on your own return here a day later, then at growing intervals.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Your kingdoms</h2>
        <div className="kingdom-strip">
          {KINGDOMS.map((k) => {
            const total = k.lessons.length;
            const mastered = k.lessons.filter((l) => s.lessons[l.id]?.mastered).length;
            const open = s.unlocked.includes(k.id);
            return (
              <a key={k.id} href={href(`kingdom/${k.id}`)} className={`kingdom-tile ${open ? '' : 'sealed'} ${!total ? 'soon' : ''}`}>
                <span className="kt-emblem" aria-hidden>{k.emblem}</span>
                <span className="kt-name">{k.name}</span>
                <span className="kt-meta">{total ? `${mastered}/${total} mastered` : 'In preparation'}{s.bosses[k.id]?.defeated ? ' · ⚑' : ''}</span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}

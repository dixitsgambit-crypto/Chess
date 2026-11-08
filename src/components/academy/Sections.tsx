import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Chess } from 'chess.js';
import { KINGDOMS, kingdomById, ALL_LESSONS } from '../../academy/content';
import { MASTER_GAMES, MASTERS_PENDING, type MasterGame } from '../../content/masterGames';
import type { PlayoutTask } from '../../content/schema';
import { probeKpk } from '../../chess/kpk';
import { Board } from '../Board';
import {
  ACHIEVEMENTS, BOARD_THEMES, TITLES, changePassword, deleteAccount, getAccount, levelFor, login, logout, register, resetProgress, revokeOtherSessions, startTournament, submitGuesses, withdrawTournament,
  streak, titleFor, updateProfile, updateSettings, useSession, useStore, xpForLevel, type TournamentRec,
} from '../../academy/store';
import { href } from '../../academy/router';
import { api } from '../../academy/api';
import { PageHead } from './Shell';
import { lessonStatus, Meter, StatusBadge } from './LessonPlayer';
import { TaskRunner } from './TaskRunner';
import { GameVsEngine, TIME_CONTROLS } from './Coach';
import LegacyOpeningLab from '../../OpeningLab';

// ------------------------------------------------------------------ Opening Laboratory

export function OpeningLab() {
  const k = kingdomById('openings')!;
  const courses = { White: ['Italian Game', 'Ruy Lopez', "Queen's Gambit", 'English Opening', 'Scotch Game', 'London System', 'Catalan'], Black: ['Caro-Kann', 'French Defence', 'Sicilian Defence', "Queen's Gambit Declined", 'Slav Defence', "King's Indian Defence", 'Dutch Defence'] };
  return (
    <div>
      <PageHead eyebrow={`Kingdom ${k.order} · ${k.name}`} title="Opening Laboratory">
        Study your own repertoire from PGN: lesson playback, line practice, an explorer with transpositions, quizzes and notes — every move validated, engine output kept separate.
      </PageHead>
      <section className="card">
        <h2 className="card-title">Structured opening courses</h2>
        <p className="muted small">Each course will ship with explanations, variations, model games, quizzes and repertoire recall — but only after every move tree is validated. Until then, load your own repertoire below.</p>
        <div className="grid-2">
          {Object.entries(courses).map(([side, list]) => (
            <div key={side}><h3 className="small-title">{side} repertoire</h3><ul className="topic-cloud">{list.map((c) => <li key={c}>{c} <span className="muted small">· in preparation</span></li>)}</ul></div>
          ))}
        </div>
      </section>
      <div className="legacy-lab"><LegacyOpeningLab /></div>
    </div>
  );
}

// ------------------------------------------------------------------ Endgame Citadel

function randomKpk(goal: 'promote' | 'hold'): PlayoutTask {
  const files = 'abcdefgh';
  for (let tries = 0; tries < 5000; tries++) {
    const sq = () => files[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
    const p = files[1 + Math.floor(Math.random() * 6)] + (2 + Math.floor(Math.random() * 4));
    const wk = sq(), bk = sq();
    if (new Set([p, wk, bk]).size < 3) continue;
    const board: (string | null)[][] = Array.from({ length: 8 }, () => Array(8).fill(null));
    const put = (s: string, ch: string) => { board[8 - Number(s[1])][files.indexOf(s[0])] = ch; };
    put(wk, 'K'); put(bk, 'k'); put(p, 'P');
    const rows = board.map((r) => { let out = '', n = 0; for (const c of r) { if (c) { if (n) out += n; n = 0; out += c; } else n++; } return out + (n || ''); });
    const stm = goal === 'promote' ? 'w' : 'b';
    const fen = `${rows.join('/')} ${stm} - - 0 1`;
    try {
      const c = new Chess(fen);
      if (c.isGameOver()) continue;
      const pr = probeKpk(fen);
      if (!pr) continue;
      if (goal === 'promote' && pr.result === 'win' && Number(p[1]) <= 4) return { kind: 'playout', id: `kpk-${fen}`, fen, goal, maxMoves: 25, opponent: 'kpk', prompt: 'White to move. Promote safely against perfect defence.', explanation: 'Lead with the king and use the opposition.', hints: ['Get your king in front of the pawn.'], difficulty: 3, objective: 'Practical endgame technique', themes: ['kpk'] };
      if (goal === 'hold' && pr.result === 'draw' && c.moves().length > 1) return { kind: 'playout', id: `kpk-${fen}`, fen, goal, maxMoves: 15, opponent: 'kpk', orientation: 'black', prompt: 'Black to move. Hold the draw for 15 moves against perfect attack.', explanation: 'Keep your king in front of the pawn and take the opposition.', hints: ['Head for the square in front of the pawn.'], difficulty: 3, objective: 'Theoretical draws', themes: ['kpk'] };
    } catch { /* illegal random position */ }
  }
  throw new Error('no position found');
}

export function EndgameCitadel() {
  const s = useStore();
  const k = kingdomById('endgames')!;
  const [trainer, setTrainer] = useState<{ task: PlayoutTask; n: number } | null>(null);
  const [outcome, setOutcome] = useState<string>('');
  return (
    <div>
      <PageHead eyebrow={`Kingdom ${k.order} · ${k.epithet}`} title="Endgame Citadel">{k.description} Every king-and-pawn verdict here is checked by an exact solver.</PageHead>
      <ol className="lesson-list">
        {k.lessons.map((l, i) => (
          <li key={l.id}><a href={href(`lesson/${l.id}/intro`)} className="lesson-row"><span className="lr-n">{i + 1}</span><span className="lr-body"><span className="lr-title">{l.title}</span><span className="lr-sum">{l.summary}</span></span><StatusBadge status={lessonStatus(s, l)} /></a></li>
        ))}
      </ol>
      {k.boss && <div className="row"><a className="btn primary" href={href(`boss/${k.id}`)}>{s.bosses[k.id]?.defeated ? '✓ Citadel Warden defeated' : `Challenge ${k.boss.name}`}</a></div>}
      <section className="card">
        <h2 className="card-title">King + pawn trainer</h2>
        <p className="muted small">Random positions with a known result. Your opponent plays perfectly. Practice only — no XP.</p>
        <div className="row">
          <button className="btn" onClick={() => { setOutcome(''); setTrainer({ task: randomKpk('promote'), n: Date.now() }); }}>New winning position (attack)</button>
          <button className="btn" onClick={() => { setOutcome(''); setTrainer({ task: randomKpk('hold'), n: Date.now() }); }}>New drawn position (defend)</button>
        </div>
        {trainer && <TaskRunner key={trainer.n} task={trainer.task} practice onDone={(o) => setOutcome(o.correct ? 'Solved!' : '')} />}
        {outcome && <p className="ok">{outcome}</p>}
      </section>
      <section className="card">
        <h2 className="card-title">Roadmap for the Citadel</h2>
        <ul className="topic-cloud">{k.topics.map((t) => <li key={t} className={k.lessons.some((l) => l.topics.includes(t)) ? 'covered' : ''}>{t}</li>)}</ul>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ Master Games Library

export function MasterLibrary({ id }: { id?: string }) {
  const game = MASTER_GAMES.find((g) => g.id === id);
  if (game) return <GameViewer game={game} />;
  return (
    <div>
      <PageHead eyebrow="Kingdom 9 · Masters’ Library" title="Master Games Library">Historical games replayed move by move, with a Guess-the-Move trainer. Game scores are public domain; we add only documented facts, never invented annotations.</PageHead>
      <div className="game-cards">
        {MASTER_GAMES.map((g) => (
          <a key={g.id} className="game-card" href={href(`library/${g.id}`)}>
            <span className="gc-title">{g.title}</span>
            <span className="gc-players">{g.white} – {g.black}</span>
            <span className="muted small">{g.event}, {g.year} · {g.result}</span>
            <span className="small">{g.themes.join(' · ')}</span>
          </a>
        ))}
      </div>
      <section className="card">
        <h2 className="card-title">World champion courses</h2>
        <p className="muted small">Courses on Morphy’s era are open above. The following require verified PGN sources and attribution before publication:</p>
        <ul className="topic-cloud">{MASTERS_PENDING.map((m) => <li key={m}>{m}</li>)}</ul>
      </section>
    </div>
  );
}

function GameViewer({ game }: { game: MasterGame }) {
  const frames = useMemo(() => {
    const c = new Chess();
    c.loadPgn(game.pgn);
    const moves = c.history({ verbose: true });
    const r = new Chess();
    return [{ fen: r.fen(), san: '', last: undefined as [string, string] | undefined, color: 'b' as 'w' | 'b' }, ...moves.map((m) => { r.move(m.san); return { fen: r.fen(), san: m.san, last: [m.from, m.to] as [string, string], color: m.color }; })];
  }, [game]);
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<{ side: 'w' | 'b'; right: number; asked: number; msg: string; guesses: string[] } | null>(null);
  const s = useStore();
  const fen = frames[i].fen;
  const turnAt = fen.split(' ')[1] as 'w' | 'b';
  const guessing = guess && i < frames.length - 1 && turnAt === guess.side;

  const onGuess = (uci: string) => {
    if (!guess) return;
    const nextF = frames[i + 1];
    const c = new Chess(fen);
    let mv;
    try { mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); } catch { return; }
    const ok = mv.san === nextF.san;
    const g = { ...guess, guesses: [...guess.guesses, mv.san], asked: guess.asked + 1, right: guess.right + (ok ? 1 : 0), msg: ok ? `✓ ${nextF.san} — exactly what ${guess.side === 'w' ? game.white : game.black} played.` : `The game continued ${nextF.san} (you tried ${mv.san}).` };
    // advance through the opponent's reply too
    let ni = i + 1;
    if (ni < frames.length - 1 && frames[ni].fen.split(' ')[1] !== guess.side) ni++;
    setI(ni);
    setGuess(g);
    if (ni >= frames.length - 1) {
      // the server scores the session from the guesses themselves
      void submitGuesses(game.id, g.side, g.guesses).then((r) => {
        if (r) setGuess((x) => x && { ...x, msg: `${x.msg} Final score: ${r.right}/${r.total} (${r.pct}%).` });
      });
    }
  };

  const startGuess = (side: 'w' | 'b') => {
    let start = 0;
    if (side === 'b') start = 1;
    setI(start);
    setGuess({ side, right: 0, asked: 0, guesses: [], msg: `Guess each move played by ${side === 'w' ? game.white : game.black}.` });
  };

  return (
    <div>
      <nav className="crumbs"><a href={href('library')}>Master Games</a> › <span>{game.title}</span></nav>
      <PageHead eyebrow={`${game.event}, ${game.year}`} title={game.title}>{game.white} – {game.black} · {game.result}</PageHead>
      <div className="analysis">
        <div className="analysis-board">
          <Board fen={fen} orientation={guess?.side === 'b' ? 'black' : 'white'} lastMove={frames[i].last} movable={guessing ? (guess!.side === 'w' ? 'white' : 'black') : null} onMove={onGuess} label={`${game.title} board`} />
          {!guess && (
            <div className="nav-row">
              <button className="btn ghost small" onClick={() => setI(0)} disabled={!i} aria-label="Start">⏮</button>
              <button className="btn ghost small" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={!i} aria-label="Back">◀</button>
              <span className="small muted">{i}/{frames.length - 1}</span>
              <button className="btn ghost small" onClick={() => setI((x) => Math.min(frames.length - 1, x + 1))} disabled={i >= frames.length - 1} aria-label="Forward">▶</button>
              <button className="btn ghost small" onClick={() => setI(frames.length - 1)} disabled={i >= frames.length - 1} aria-label="End">⏭</button>
            </div>
          )}
        </div>
        <div className="analysis-side">
          <section className="card">
            <h2 className="card-title">About this game</h2>
            <p>{game.context}</p>
            <p className="small muted">Source: {game.source}</p>
          </section>
          <section className="card">
            <h2 className="card-title">Guess the move</h2>
            {guess ? (
              <>
                <p>{guess.msg}</p>
                <p className="small muted">Score {guess.right}/{guess.asked}{s.guessBest[game.id] !== undefined ? ` · best ${s.guessBest[game.id]}%` : ''}</p>
                <button className="btn ghost small" onClick={() => setGuess(null)}>Stop guessing</button>
              </>
            ) : (
              <div className="row"><button className="btn" onClick={() => startGuess('w')}>Play as {game.white.split(' ').slice(-1)[0]} (White)</button><button className="btn ghost" onClick={() => startGuess('b')}>Play as Black</button></div>
            )}
          </section>
          <section className="card">
            <h2 className="card-title">Moves</h2>
            <p className="moves-line">{frames.slice(1).map((f, k) => <button key={k} className={`mv ${k + 1 === i ? 'sel' : ''}`} onClick={() => !guess && setI(k + 1)} disabled={!!guess}>{k % 2 === 0 ? `${k / 2 + 1}.` : ''}{f.san}</button>)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tournament Hall

const pts = (r?: string) => (r === 'win' ? 1 : r === 'draw' ? 0.5 : 0);

export function TournamentHall() {
  const s = useStore();
  const t = s.tournament;
  const [tc, setTc] = useState('5+3');
  // the round being played is fixed when the game starts; the server fills in results
  const [playing, setPlaying] = useState<{ idx: number; round: TournamentRec['rounds'][number]; tc: string } | null>(null);
  const cupGames = s.games.filter((g) => g.event?.startsWith('Kingdom Cup'));
  const roundIdx = t ? t.rounds.findIndex((r) => !r.result) : -1;
  const score = t ? t.rounds.reduce((n, r) => n + pts(r.result), 0) : 0;

  if (playing) {
    const r = playing.round;
    return (
      <div>
        <PageHead eyebrow={`Kingdom Cup · Round ${playing.idx + 1} of 3`} title={`vs ${r.opponent}`} />
        <GameVsEngine opponent={{ name: r.opponent, skill: r.skill }} color={r.color} tc={TIME_CONTROLS.find((x) => x.id === playing.tc)!} event={`Kingdom Cup, round ${playing.idx + 1}`}
          onExit={() => setPlaying(null)} />
      </div>
    );
  }

  return (
    <div>
      <PageHead eyebrow="Competition" title="Tournament Hall">The Kingdom Cup: three rounds against rising opponents, alternating colours, under a real clock. Score 2 points or more to lift the cup.</PageHead>
      {t && !t.finishedAt ? (
        <section className="card">
          <h2 className="card-title">Kingdom Cup in progress · {TIME_CONTROLS.find((x) => x.id === t.timeControl)?.label}</h2>
          <Standings t={t} />
          <div className="row"><button className="btn primary" onClick={() => setPlaying({ idx: roundIdx, round: t.rounds[roundIdx], tc: t.timeControl })}>Play round {roundIdx + 1}</button><button className="btn ghost" onClick={() => void withdrawTournament()}>Withdraw</button></div>
        </section>
      ) : (
        <section className="card">
          {t?.finishedAt && (
            <div className={`game-result ${score >= 2 ? 'res-win' : 'res-loss'}`}>
              <h3>{score >= 2 ? '🏆 Champion of the Kingdom Cup!' : 'The cup eludes you this time'}</h3>
              <p className="muted">Final score {score}/{t.rounds.length}</p>
              <Standings t={t} />
            </div>
          )}
          <h2 className="card-title">Enter the Kingdom Cup</h2>
          <fieldset className="field"><legend>Time control</legend>
            {TIME_CONTROLS.filter((x) => x.base).map((x) => <label key={x.id} className="radio"><input type="radio" name="cup-tc" checked={tc === x.id} onChange={() => setTc(x.id)} /> {x.label}</label>)}
          </fieldset>
          <button className="btn primary lg" onClick={() => void startTournament(tc)}>Register</button>
        </section>
      )}
      <section className="card">
        <h2 className="card-title">Tournament record</h2>
        <p>Cups won: <strong>{s.tournamentsWon}</strong> · Cup games played: {cupGames.length}</p>
        <p className="small muted">Clock management, preparation and psychology lessons belong to the Tournament Arena kingdom, which is in preparation.</p>
      </section>
    </div>
  );
}

function Standings({ t }: { t: TournamentRec }) {
  return (
    <table className="table">
      <thead><tr><th>Round</th><th>Opponent</th><th>Colour</th><th>Result</th></tr></thead>
      <tbody>{t.rounds.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.opponent} <span className="muted small">(skill {r.skill})</span></td><td>{r.color === 'w' ? 'White' : 'Black'}</td><td>{r.result ? <span className={`res res-${r.result}`}>{r.result}</span> : '—'}</td></tr>)}</tbody>
    </table>
  );
}

// ------------------------------------------------------------------ My Progress

export function ProgressView() {
  const s = useStore();
  const items = Object.values(s.items);
  const attempted = items.filter((r) => r.attempts > 0);
  const first = attempted.filter((r) => r.firstCorrect).length;
  const games = s.games;
  return (
    <div>
      <PageHead eyebrow="Records" title="My Progress" />
      <div className="stat-row">
        <Stat label="XP" value={s.xp} />
        <Stat label="Level" value={levelFor(s.xp)} />
        <Stat label="Lessons mastered" value={`${Object.values(s.lessons).filter((l) => l.mastered).length}/${ALL_LESSONS.length}`} />
        <Stat label="First-attempt accuracy" value={attempted.length ? `${Math.round((first / attempted.length) * 100)}%` : '—'} />
        <Stat label="Day streak" value={streak(s)} />
        <Stat label="Games W/D/L" value={`${games.filter((g) => g.result === 'win').length}/${games.filter((g) => g.result === 'draw').length}/${games.filter((g) => g.result === 'loss').length}`} />
      </div>
      {KINGDOMS.filter((k) => k.lessons.length).map((k) => (
        <section key={k.id} className="card">
          <h2 className="card-title">{k.emblem} {k.name}{s.bosses[k.id]?.defeated ? ' · guardian defeated' : ''}</h2>
          <table className="table">
            <thead><tr><th>Lesson</th><th>Status</th><th>Exam credit</th></tr></thead>
            <tbody>{k.lessons.map((l) => <tr key={l.id}><td><a href={href(`lesson/${l.id}/intro`)}>{l.title}</a></td><td><StatusBadge status={lessonStatus(s, l)} /></td><td><Meter value={l.exam.filter((t) => s.items[t.id]?.credited).length / l.exam.length} /></td></tr>)}</tbody>
          </table>
        </section>
      ))}
      <section className="card">
        <h2 className="card-title">Recent XP</h2>
        {s.log.length ? <ul className="xp-log">{s.log.slice(0, 20).map((e, i) => <li key={i}><span className="xp-chip">+{e.amount}</span> {e.reason} <span className="muted small">{new Date(e.at).toLocaleString()}</span></li>)}</ul> : <p className="muted">No XP yet — solve a position on your own to earn your first.</p>}
      </section>
      {s.placement && <p className="small muted">Placement taken {new Date(s.placement.at).toLocaleDateString()}; {s.placement.testedOut.length} lessons tested out.</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span className="stat-v">{value}</span><span className="stat-l">{label}</span></div>;
}

// ------------------------------------------------------------------ Achievements

export function Achievements() {
  const s = useStore();
  const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
  return (
    <div>
      <PageHead eyebrow="Trophies" title="Achievements">{got} of {ACHIEVEMENTS.length} earned. Every trophy requires something done on the board.</PageHead>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const at = s.achievements[a.id];
          return (
            <div key={a.id} className={`ach ${at ? 'got' : ''}`}>
              <span className="ach-icon" aria-hidden>{a.icon}</span>
              <span className="ach-name">{a.name}</span>
              <span className="ach-desc">{a.description}</span>
              <span className="small muted">{at ? `Earned ${new Date(at).toLocaleDateString()}` : 'Locked'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Profile

export function Profile() {
  const s = useStore();
  const level = levelFor(s.xp);
  const [name, setName] = useState(s.profile.name);
  const emblems = TITLES.filter((t) => level >= t.level);
  return (
    <div>
      <PageHead eyebrow="Player" title="Player Profile">Titles here are fictional game ranks, not official chess titles or ratings.</PageHead>
      <Account />
      <div className="grid-2">
        <section className="card">
          <div className="profile-head">
            <span className="profile-emblem" aria-hidden>{s.profile.emblem}</span>
            <div>
              <h2>{s.profile.name}</h2>
              <p className="muted">{titleFor(level).title} · Level {level} · {s.xp} XP</p>
              <p className="small muted">{xpForLevel(level + 1) - s.xp} XP to level {level + 1}</p>
            </div>
          </div>
          <form className="row" onSubmit={(e) => { e.preventDefault(); updateProfile({ name: name.trim().slice(0, 32) || 'Wanderer' }); }}>
            <label className="field grow">Display name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={32} /></label>
            <button className="btn primary" type="submit" disabled={name.trim() === s.profile.name}>Save</button>
          </form>
          <h3 className="small-title">Emblem</h3>
          <div className="row">{TITLES.map((t) => {
            const ok = emblems.includes(t);
            return <button key={t.title} className={`emblem-btn ${s.profile.emblem === t.emblem ? 'on' : ''}`} disabled={!ok} onClick={() => updateProfile({ emblem: t.emblem })} title={ok ? t.title : `Unlocks at level ${t.level}`}>{t.emblem}</button>;
          })}</div>
        </section>
        <section className="card">
          <h2 className="card-title">Board cosmetics</h2>
          <div className="theme-swatches">
            {BOARD_THEMES.map((t) => {
              const ok = level >= t.level;
              return (
                <button key={t.id} className={`swatch ${s.settings.boardTheme === t.id ? 'on' : ''}`} disabled={!ok} onClick={() => updateSettings({ boardTheme: t.id })} title={ok ? t.name : `Unlocks at level ${t.level}`}>
                  <span className="sw" style={{ background: `conic-gradient(${t.dark} 0 25%, ${t.light} 0 50%, ${t.dark} 0 75%, ${t.light} 0)` }} />
                  <span>{t.name}</span><span className="small muted">{ok ? '' : `Level ${t.level}`}</span>
                </button>
              );
            })}
          </div>
          <h3 className="small-title">Title ladder</h3>
          <ol className="ladder">{TITLES.map((t) => <li key={t.title} className={level >= t.level ? 'reached' : ''}><span>{t.emblem}</span> {t.title} <span className="muted small">level {t.level}</span></li>)}</ol>
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Account

export function Account() {
  const { user } = useSession();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  if (!user.guest) return (
    <section className="card account">
      <h2 className="card-title">Account</h2>
      <p>Signed in as <strong>{user.username}</strong>. Your progress is saved on the academy server.</p>
      <div className="row">
        <button className="btn ghost" onClick={() => void logout()}>Sign out</button>
      </div>
      <AccountSecurity guest={false} />
    </section>
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await (mode === 'register' ? register(username, password) : login(username, password)); setPassword(''); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return (
    <section className="card account" id="account">
      <h2 className="card-title">{mode === 'register' ? 'Save your progress' : 'Sign in'}</h2>
      <p className="small muted">{mode === 'register'
        ? 'You are playing as a guest. Your progress is already on the server; create an account to keep it and use it on other devices.'
        : 'Signing in switches to that account. Progress made as this guest stays with the guest session and is not merged.'}</p>
      <form className="auth-form" onSubmit={submit}>
        <label className="field">Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_\-]+" /></label>
        <label className="field">Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={8} maxLength={200} /></label>
        {err && <p className="err small" role="alert">{err}</p>}
        <div className="row">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'}</button>
          <button className="btn ghost" type="button" onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setErr(''); }}>{mode === 'register' ? 'I already have an account' : 'Create a new account instead'}</button>
        </div>
      </form>
      <AccountSecurity guest />
    </section>
  );
}

/** Password change, other devices, account deletion. Every action needs explicit confirmation. */
function AccountSecurity({ guest }: { guest: boolean }) {
  const [sessions, setSessions] = useState<number | null>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delWord, setDelWord] = useState('');
  const refresh = () => { void getAccount().then((a) => setSessions(a.activeSessions)).catch(() => setSessions(null)); };
  useEffect(refresh, []);
  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setErr(''); setMsg('');
    try { setMsg(await fn()); } catch (e) { setErr((e as Error).message); }
    setBusy(false); refresh();
  };
  return (
    <div className="account-security">
      {!guest && (
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void run(async () => { const r = await changePassword(current, next); setCurrent(''); setNext(''); return `Password changed.${r.otherSessionsSignedOut ? ` ${r.otherSessionsSignedOut} other device(s) signed out.` : ''}`; }); }}>
          <h3 className="small-title">Change password</h3>
          <label className="field">Current password<input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required /></label>
          <label className="field">New password<input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={200} /></label>
          <button className="btn" type="submit" disabled={busy}>Change password</button>
        </form>
      )}
      <h3 className="small-title">Devices</h3>
      <p className="small muted">{sessions === null ? 'Checking…' : `Signed in on ${sessions} device${sessions === 1 ? '' : 's'} (including this one).`}</p>
      <button className="btn ghost small" disabled={busy || !sessions || sessions < 2} onClick={() => void run(async () => `${(await revokeOtherSessions()).signedOut} other device(s) signed out.`)}>Sign out all other devices</button>
      {msg && <p className="ok small" role="status">{msg}</p>}
      {err && <p className="err small" role="alert">{err}</p>}
      <h3 className="small-title">Delete account</h3>
      {deleting ? (
        <form className="callout warn" onSubmit={(e) => { e.preventDefault(); void run(async () => { await deleteAccount(delPw); return 'Account deleted.'; }); }}>
          <div>This permanently deletes {guest ? 'this guest profile' : 'your account'}, all progress, games and Opening Laboratory data. It cannot be undone. Export your progress in Settings first if you want a copy.</div>
          {!guest && <label className="field">Password<input type="password" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" required /></label>}
          <label className="field">Type DELETE to confirm<input value={delWord} onChange={(e) => setDelWord(e.target.value)} /></label>
          <div className="row"><button className="btn danger" type="submit" disabled={busy || delWord !== 'DELETE'}>Delete permanently</button><button className="btn ghost" type="button" onClick={() => { setDeleting(false); setDelWord(''); setDelPw(''); }}>Cancel</button></div>
        </form>
      ) : <button className="btn ghost danger-text small" onClick={() => setDeleting(true)}>Delete {guest ? 'this guest profile' : 'my account'}…</button>}
    </div>
  );
}

const COMPONENTS: [string, string, string][] = [
  ['Stockfish 16', 'GPL-3.0', 'https://github.com/official-stockfish/Stockfish'],
  ['stockfish.js (WASM build)', 'GPL-3.0', 'https://github.com/nmrugg/stockfish.js'],
  ['chessground (board)', 'GPL-3.0-or-later', 'https://github.com/lichess-org/chessground'],
  ['chess.js (rules)', 'BSD-2-Clause', 'https://github.com/jhlywa/chess.js'],
  ['React', 'MIT', 'https://github.com/facebook/react'],
  ['Cinzel & Inter fonts', 'SIL OFL 1.1', 'https://fonts.google.com'],
];

function AboutLicences() {
  const [about, setAbout] = useState<{ licence: string; sourceUrl: string | null } | null>(null);
  useEffect(() => { void api.get<{ licence: string; sourceUrl: string | null }>('/api/about').then(setAbout).catch(() => setAbout(null)); }, []);
  return (
    <section className="card">
      <h2 className="card-title">About & licences</h2>
      <p className="small">Chessverse Academy is free software under the <strong>GNU GPL, version 3 or later</strong>. You may use, study, share and modify it under those terms.</p>
      <p className="small">{about?.sourceUrl ? <>Complete source code: <a href={about.sourceUrl} rel="noopener noreferrer" target="_blank">{about.sourceUrl}</a></> : 'This copy has no public source link configured. If you are using a public deployment, the operator must provide its source code.'}</p>
      <table className="table">
        <thead><tr><th>Component</th><th>Licence</th></tr></thead>
        <tbody>{COMPONENTS.map(([n, l, url]) => <tr key={n}><td><a href={url} rel="noopener noreferrer" target="_blank">{n}</a></td><td>{l}</td></tr>)}</tbody>
      </table>
      <p className="small muted">Fictional titles and simulated results here are not official FIDE titles or ratings.</p>
    </section>
  );
}

// ------------------------------------------------------------------ Settings

export function SettingsView() {
  const s = useStore();
  const [msg, setMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const set = s.settings;
  return (
    <div>
      <PageHead eyebrow="Preferences" title="Settings" />
      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Board & motion</h2>
          <label className="field">Motion
            <select value={set.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.value as typeof set.reducedMotion })}>
              <option value="system">Follow my system setting</option><option value="on">Reduce motion</option><option value="off">Full animation</option>
            </select>
          </label>
          <label className="toggle"><input type="checkbox" checked={set.coordinates} onChange={(e) => updateSettings({ coordinates: e.target.checked })} /> Show board coordinates</label>
          <label className="toggle"><input type="checkbox" checked={set.showDests} onChange={(e) => updateSettings({ showDests: e.target.checked })} /> Highlight legal destinations</label>
          <label className="toggle"><input type="checkbox" checked={set.autoQueen} onChange={(e) => updateSettings({ autoQueen: e.target.checked })} /> Always promote to a queen (skip the piece picker)</label>
          <p className="small muted">Board themes are in your <a href={href('profile')}>profile</a>.</p>
        </section>
        <section className="card">
          <h2 className="card-title">Your data</h2>
          <p className="small muted">Your progress lives on the academy server and is awarded only by its rules, so it cannot be imported. Export a copy of your record at any time; to use it on another device, <a href={href('profile')}>create an account</a> and sign in there.</p>
          <div className="row">
            <a className="btn" href="/api/progress/export" download="chessverse-progress.json">Export progress</a>
          </div>
          {msg && <p className="small">{msg}</p>}
          <h3 className="small-title">Danger zone</h3>
          {confirmReset ? (
            <div className="callout warn">
              <div>This permanently erases your XP, mastery, reviews and games on the server. It cannot be undone.</div>
              <div className="row"><button className="btn danger" onClick={async () => { const r = await resetProgress(); setConfirmReset(false); if (r) setMsg('Progress reset.'); }}>Erase everything</button><button className="btn ghost" onClick={() => setConfirmReset(false)}>Cancel</button></div>
            </div>
          ) : <button className="btn ghost danger-text" onClick={() => setConfirmReset(true)}>Reset all progress…</button>}
        </section>
      </div>
      <AboutLicences />
    </div>
  );
}

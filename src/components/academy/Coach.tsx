import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../Board';
import { EnginePanel, pvToSan } from '../EnginePanel';
import { checkMove, engine, formatScore, playEngine, type MoveCheck } from '../../engine/stockfish';
import { observe } from '../../chess/observe';
import { fenProblem } from '../../chess/fen';
import { recordGame, useStore, type GameRec } from '../../academy/store';
import { go, href } from '../../academy/router';
import { PageHead } from './Shell';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const HANDOFF = 'chessverse.analyse';
const uciToMove = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

export function Coach({ tab }: { tab?: string }) {
  const t = tab === 'play' ? 'play' : 'analyse';
  return (
    <div>
      <PageHead eyebrow="AI Grandmaster" title="The Grandmaster’s Study">
        Analyse any position with Stockfish 16, get rule-checked observations about it, or play a game against the engine at the strength you choose.
      </PageHead>
      <div className="tabs" role="tablist">
        <a role="tab" aria-selected={t === 'analyse'} className={`tab ${t === 'analyse' ? 'on' : ''}`} href={href('coach/analyse')}>Analysis board</a>
        <a role="tab" aria-selected={t === 'play'} className={`tab ${t === 'play' ? 'on' : ''}`} href={href('coach/play')}>Play the Grandmaster</a>
      </div>
      {t === 'analyse' ? <AnalysisBoard /> : <PlaySetup />}
    </div>
  );
}

// --------------------------------------------------------------- analysis board

interface Line { start: string; moves: string[] }

function fensOf(line: Line) {
  const c = new Chess(line.start);
  const out = [{ fen: line.start, last: undefined as [string, string] | undefined }];
  for (const m of line.moves) { const mv = c.move(m); out.push({ fen: c.fen(), last: [mv.from, mv.to] }); }
  return out;
}

function AnalysisBoard() {
  const [line, setLine] = useState<Line>(() => {
    try {
      const pgn = sessionStorage.getItem(HANDOFF);
      if (pgn) { sessionStorage.removeItem(HANDOFF); const c = new Chess(); c.loadPgn(pgn); return { start: START, moves: c.history() }; }
    } catch { /* ignore */ }
    return { start: START, moves: [] };
  });
  const [cursor, setCursor] = useState(line.moves.length);
  const [variations, setVariations] = useState<{ at: number; moves: string[] }[]>([]);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [review, setReview] = useState(true);
  const [verdict, setVerdict] = useState<{ san: string; check: MoveCheck; fenBefore: string } | null>(null);
  const [io, setIo] = useState<'' | 'fen' | 'pgn'>('');
  const [ioText, setIoText] = useState('');
  const [ioErr, setIoErr] = useState('');
  const reviewReq = useRef(0);
  const frames = useMemo(() => fensOf(line), [line]);
  const fen = frames[cursor].fen;
  const facts = useMemo(() => observe(fen), [fen]);
  const turn = fen.split(' ')[1] === 'w' ? 'white' : 'black';

  const onMove = (uci: string) => {
    const c = new Chess(fen);
    let mv;
    try { mv = c.move(uciToMove(uci)); } catch { return; }
    const rest = line.moves.slice(cursor);
    if (rest.length && rest[0] !== mv.san) setVariations((v) => [{ at: cursor, moves: rest }, ...v].slice(0, 12));
    const moves = rest[0] === mv.san ? line.moves : [...line.moves.slice(0, cursor), mv.san];
    setLine({ ...line, moves });
    setCursor(cursor + 1);
    setVerdict(null);
    const req = ++reviewReq.current;
    if (review) {
      const before = fen;
      checkMove(before, uci, 12).then((check) => { if (req === reviewReq.current) setVerdict({ san: mv.san, check, fenBefore: before }); }).catch(() => undefined);
    }
  };

  const restoreVariation = (i: number) => {
    const v = variations[i];
    const current = line.moves.slice(v.at);
    setVariations((vs) => [...vs.filter((_, k) => k !== i), ...(current.length ? [{ at: v.at, moves: current }] : [])]);
    setLine({ ...line, moves: [...line.moves.slice(0, v.at), ...v.moves] });
    setCursor(v.at + 1);
  };

  const exportPgn = () => {
    const c = new Chess(line.start);
    if (line.start !== START) { c.setHeader('SetUp', '1'); c.setHeader('FEN', line.start); }
    c.setHeader('Event', 'Chessverse analysis');
    for (const m of line.moves) c.move(m);
    return c.pgn();
  };

  const applyImport = () => {
    setIoErr('');
    try {
      if (io === 'fen') {
        const problem = fenProblem(ioText.trim());
        if (problem) throw new Error(problem);
        const c = new Chess(ioText.trim());
        setLine({ start: c.fen(), moves: [] }); setCursor(0);
      } else {
        const c = new Chess();
        c.loadPgn(ioText);
        const start = c.getHeaders().FEN ?? START;
        const problem = fenProblem(start);
        if (problem) throw new Error(`the PGN starts from an impossible position: ${problem}`);
        setLine({ start, moves: c.history() }); setCursor(c.history().length);
      }
      setVariations([]); setIo(''); setVerdict(null);
    } catch (e) { setIoErr(`Could not read that ${io.toUpperCase()}: ${(e as Error).message}`); }
  };

  const pairs: { n: number; w?: string; b?: string; wi: number; bi: number }[] = [];
  const startBlack = line.start.split(' ')[1] === 'b';
  const startNo = Number(line.start.split(' ')[5] ?? 1);
  line.moves.forEach((m, i) => {
    const idx = i + (startBlack ? 1 : 0);
    const row = Math.floor(idx / 2);
    pairs[row] ??= { n: startNo + row, wi: row * 2 - (startBlack ? 1 : 0), bi: row * 2 + 1 - (startBlack ? 1 : 0) };
    if (idx % 2 === 0) pairs[row].w = m; else pairs[row].b = m;
  });

  return (
    <div className="analysis">
      <div className="analysis-board">
        <Board fen={fen} orientation={orientation} lastMove={frames[cursor].last} movable={turn} onMove={onMove} label="Analysis board" />
        <div className="nav-row">
          <button className="btn ghost small" onClick={() => setCursor(0)} disabled={!cursor} aria-label="First move">⏮</button>
          <button className="btn ghost small" onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={!cursor} aria-label="Previous move">◀</button>
          <button className="btn ghost small" onClick={() => setCursor((c) => Math.min(line.moves.length, c + 1))} disabled={cursor >= line.moves.length} aria-label="Next move">▶</button>
          <button className="btn ghost small" onClick={() => setCursor(line.moves.length)} disabled={cursor >= line.moves.length} aria-label="Last move">⏭</button>
          <button className="btn ghost small" onClick={() => { setLine({ ...line, moves: line.moves.slice(0, Math.max(0, cursor - 1)) }); setCursor(Math.max(0, cursor - 1)); setVerdict(null); }} disabled={!cursor}>Undo</button>
          <button className="btn ghost small" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>Flip</button>
          <button className="btn ghost small" onClick={() => { setLine({ start: START, moves: [] }); setCursor(0); setVariations([]); setVerdict(null); }}>Reset</button>
        </div>
        <div className="row center">
          <button className="btn small" onClick={() => { setIo('fen'); setIoText(fen); setIoErr(''); }}>FEN</button>
          <button className="btn small" onClick={() => { setIo('pgn'); setIoText(exportPgn()); setIoErr(''); }}>PGN</button>
          <label className="toggle small"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} /> Review my moves</label>
        </div>
        {io && (
          <div className="io-box">
            <label className="small muted" htmlFor="io">{io.toUpperCase()} — copy it, or paste your own and import.</label>
            <textarea id="io" rows={io === 'pgn' ? 6 : 2} value={ioText} onChange={(e) => setIoText(e.target.value)} />
            {ioErr && <p className="err small">{ioErr}</p>}
            <div className="row"><button className="btn primary small" onClick={applyImport}>Import</button><button className="btn ghost small" onClick={() => navigator.clipboard?.writeText(ioText)}>Copy</button><button className="btn ghost small" onClick={() => setIo('')}>Close</button></div>
          </div>
        )}
      </div>
      <div className="analysis-side">
        <section className="card">
          <h2 className="card-title">Moves</h2>
          {line.moves.length ? (
            <ol className="move-table">
              {pairs.map((p) => (
                <li key={p.n}>
                  <span className="mn">{p.n}.</span>
                  {p.w ? <button className={`mv ${cursor === p.wi + 1 ? 'sel' : ''}`} onClick={() => setCursor(p.wi + 1)}>{p.w}</button> : <span className="mv">…</span>}
                  {p.b && <button className={`mv ${cursor === p.bi + 1 ? 'sel' : ''}`} onClick={() => setCursor(p.bi + 1)}>{p.b}</button>}
                </li>
              ))}
            </ol>
          ) : <p className="muted small">Make a move on the board for either side.</p>}
          {variations.length > 0 && (
            <>
              <h3 className="small-title">Saved variations</h3>
              <ul className="variations">{variations.map((v, i) => <li key={i}><button className="link" onClick={() => restoreVariation(i)}>after move {Math.floor(v.at / 2) + 1}: {v.moves.slice(0, 6).join(' ')}{v.moves.length > 6 ? '…' : ''}</button></li>)}</ul>
            </>
          )}
        </section>
        {verdict && (
          <section className={`card verdict v-${verdict.check.verdict}`}>
            <h2 className="card-title">Grandmaster’s review of {verdict.san}</h2>
            <p>{verdict.check.verdict === 'ok' ? 'A sound move — within half a pawn of the engine’s choice.' : `${verdict.check.verdict[0].toUpperCase() + verdict.check.verdict.slice(1)}: about ${verdict.check.loss.toFixed(1)} pawns worse than the best move.`}</p>
            {verdict.check.verdict !== 'ok' && <p className="small">Best was <strong>{pvToSan(verdict.fenBefore, verdict.check.best.pv, 1)}</strong> ({formatScore(verdict.check.best)}); the line: {pvToSan(verdict.fenBefore, verdict.check.best.pv, 6)}</p>}
            <p className="small muted">Stockfish 16 · depth {verdict.check.depth}. Scores from White’s side.</p>
          </section>
        )}
        <section className="card">
          <h2 className="card-title">Observations</h2>
          <ul className="facts">{facts.map((f, i) => <li key={i} className={`fact-${f.tone}`}>{f.text}</li>)}</ul>
          <p className="small muted">Computed from the rules of chess — no guesswork.</p>
        </section>
        <EnginePanel fen={fen} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------- play vs engine

export const TIME_CONTROLS = [
  { id: 'untimed', label: 'Untimed', base: 0, inc: 0 },
  { id: '10+0', label: '10 min', base: 600, inc: 0 },
  { id: '5+3', label: '5 min + 3 s', base: 300, inc: 3 },
  { id: '3+2', label: '3 min + 2 s', base: 180, inc: 2 },
];
export const strengthName = (skill: number) => (skill <= 2 ? 'Novice' : skill <= 5 ? 'Club player' : skill <= 9 ? 'Strong club player' : skill <= 14 ? 'Expert' : skill < 20 ? 'Master' : 'Full strength');

function PlaySetup() {
  const [skill, setSkill] = useState(3);
  const [color, setColor] = useState<'w' | 'b' | 'random'>('w');
  const [tc, setTc] = useState('10+0');
  const [game, setGame] = useState<{ key: number; color: 'w' | 'b' } | null>(null);
  const s = useStore();
  const recent = s.games.filter((g) => !g.event).slice(0, 5);
  if (game) return <GameVsEngine key={game.key} opponent={{ name: 'The Grandmaster', skill }} color={game.color} tc={TIME_CONTROLS.find((t) => t.id === tc)!} allowTakeback onExit={() => setGame(null)} />;
  return (
    <div className="grid-2">
      <section className="card">
        <h2 className="card-title">New game</h2>
        <label className="field">Strength: <strong>Skill {skill}</strong> — {strengthName(skill)}
          <input type="range" min={0} max={20} value={skill} onChange={(e) => setSkill(Number(e.target.value))} />
        </label>
        <fieldset className="field">
          <legend>Your colour</legend>
          {(['w', 'b', 'random'] as const).map((c) => <label key={c} className="radio"><input type="radio" name="color" checked={color === c} onChange={() => setColor(c)} /> {c === 'w' ? 'White' : c === 'b' ? 'Black' : 'Random'}</label>)}
        </fieldset>
        <fieldset className="field">
          <legend>Time control</legend>
          {TIME_CONTROLS.map((t) => <label key={t.id} className="radio"><input type="radio" name="tc" checked={tc === t.id} onChange={() => setTc(t.id)} /> {t.label}</label>)}
        </fieldset>
        <button className="btn primary lg" onClick={() => setGame({ key: Date.now(), color: color === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : color })}>Play</button>
        <p className="small muted">Stockfish’s “Skill Level” deliberately plays weaker moves at low settings. Skill 20 is full strength.</p>
      </section>
      <section className="card">
        <h2 className="card-title">Recent games</h2>
        {recent.length ? <ul className="games">{recent.map((g) => <li key={g.at}><span className={`res res-${g.result}`}>{g.result}</span> vs skill {g.skill} as {g.color === 'w' ? 'White' : 'Black'} · {g.reason} <span className="muted small">{new Date(g.at).toLocaleDateString()}</span></li>)}</ul> : <p className="muted">No games yet.</p>}
      </section>
    </div>
  );
}

const fmt = (sec: number) => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, '0')}`;

interface GameProps {
  opponent: { name: string; skill: number };
  color: 'w' | 'b';
  tc: { id: string; label: string; base: number; inc: number };
  allowTakeback?: boolean;
  event?: string;
  onFinish?: (g: GameRec) => void;
  onExit?: () => void;
}

export function GameVsEngine({ opponent, color, tc, allowTakeback, event, onFinish, onExit }: GameProps) {
  const game = useRef(new Chess());
  const [fen, setFen] = useState(game.current.fen());
  const [last, setLast] = useState<[string, string] | undefined>();
  const [clock, setClock] = useState({ w: tc.base, b: tc.base });
  const [result, setResult] = useState<{ r: 'win' | 'loss' | 'draw'; reason: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [note, setNote] = useState('');
  const timed = tc.base > 0;
  const turn = fen.split(' ')[1] as 'w' | 'b';
  const lastTick = useRef(Date.now());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const finish = (r: 'win' | 'loss' | 'draw', reason: string) => {
    if (result) return;
    setResult({ r, reason });
    game.current.setHeader('White', color === 'w' ? 'You' : `${opponent.name} (skill ${opponent.skill})`);
    game.current.setHeader('Black', color === 'b' ? 'You' : `${opponent.name} (skill ${opponent.skill})`);
    game.current.setHeader('Result', r === 'draw' ? '1/2-1/2' : (r === 'win') === (color === 'w') ? '1-0' : '0-1');
    if (event) game.current.setHeader('Event', event);
    const rec: GameRec = { at: Date.now(), opponent: opponent.name, skill: opponent.skill, color, result: r, reason, timeControl: tc.id, pgn: game.current.pgn(), event };
    recordGame(rec);
    onFinish?.(rec);
  };

  const checkEnd = () => {
    const c = game.current;
    if (c.isCheckmate()) return finish(c.turn() === color ? 'loss' : 'win', 'checkmate'), true;
    if (c.isStalemate()) return finish('draw', 'stalemate'), true;
    if (c.isInsufficientMaterial()) return finish('draw', 'insufficient material'), true;
    if (c.isThreefoldRepetition()) return finish('draw', 'threefold repetition'), true;
    if (c.isDrawByFiftyMoves()) return finish('draw', 'fifty-move rule'), true;
    return false;
  };

  // clock
  useEffect(() => {
    if (!timed || result) return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      setClock((cl) => {
        const t = { ...cl, [turn]: cl[turn] - dt };
        if (t[turn] <= 0) setTimeout(() => finish(turn === color ? 'loss' : 'win', 'time forfeit'), 0);
        return t;
      });
    }, 200);
    return () => clearInterval(id);
  }, [turn, timed, result]);

  // engine move
  useEffect(() => {
    if (result || turn === color) return;
    let live = true;
    setThinking(true);
    const movetime = timed ? Math.min(1500, Math.max(150, clock[turn] * 20)) : 300 + opponent.skill * 60;
    playEngine.bestMove(game.current.fen(), { skill: opponent.skill, movetime }).then((uci) => {
      if (!live || !alive.current) return;
      setThinking(false);
      const c = game.current;
      const mv = uci ? c.move(uciToMove(uci)) : c.move(c.moves()[Math.floor(Math.random() * c.moves().length)]);
      if (timed) setClock((cl) => ({ ...cl, [mv.color]: cl[mv.color] + tc.inc }));
      setLast([mv.from, mv.to]);
      setFen(c.fen());
      checkEnd();
    }).catch(() => { setThinking(false); setNote('The engine could not start in this browser.'); });
    return () => { live = false; };
  }, [fen, result]);

  const onMove = (uci: string) => {
    if (result || turn !== color) return;
    const c = game.current;
    let mv;
    try { mv = c.move(uciToMove(uci)); } catch { return; }
    if (timed) setClock((cl) => ({ ...cl, [color]: cl[color] + tc.inc }));
    setLast([mv.from, mv.to]);
    setFen(c.fen());
    setNote('');
    checkEnd();
  };

  const offerDraw = async () => {
    setNote('The Grandmaster considers your offer…');
    try {
      const a = await engine.analyse(game.current.fen(), { depth: 12, multipv: 1 });
      const l = a.lines[0];
      const fromEngine = (l.mate !== null ? Math.sign(l.mate) * 100 : (l.cp ?? 0) / 100) * (color === 'w' ? -1 : 1);
      if (game.current.history().length >= 30 && fromEngine <= 0.3) { setNote(''); finish('draw', 'draw agreed'); }
      else setNote(game.current.history().length < 30 ? 'Declined: it is too early for a draw (before move 15).' : 'Declined: the Grandmaster believes they stand better.');
    } catch { setNote('The engine is unavailable; the offer cannot be judged.'); }
  };

  const takeback = () => {
    const c = game.current;
    c.undo(); if (c.turn() !== color) c.undo();
    setFen(c.fen()); setLast(undefined); setNote('');
  };

  const analyse = () => { try { sessionStorage.setItem(HANDOFF, game.current.pgn()); } catch { /* ignore */ } go('coach/analyse'); };
  const top = color === 'w' ? 'b' : 'w';
  const history = game.current.history();

  return (
    <div className="analysis">
      <div className="analysis-board">
        <div className={`clock ${turn === top && !result ? 'running' : ''}`}><span>{opponent.name} · skill {opponent.skill}</span>{timed && <strong>{fmt(clock[top])}</strong>}</div>
        <Board fen={fen} orientation={color === 'w' ? 'white' : 'black'} lastMove={last} movable={!result && turn === color ? (color === 'w' ? 'white' : 'black') : null} onMove={onMove} label="Game board" />
        <div className={`clock ${turn === color && !result ? 'running' : ''}`}><span>You</span>{timed && <strong className={clock[color] < 20 ? 'low' : ''}>{fmt(clock[color])}</strong>}</div>
      </div>
      <div className="analysis-side">
        <section className="card">
          <h2 className="card-title">{event ?? 'Casual game'} · {tc.label}</h2>
          {thinking && !result && <p className="muted small">The Grandmaster is thinking…</p>}
          {note && <p className="small">{note}</p>}
          <p className="moves-line">{history.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.${m}` : m)).join(' ') || 'No moves yet.'}</p>
          {result ? (
            <div className={`game-result res-${result.r}`}>
              <h3>{result.r === 'win' ? 'Victory' : result.r === 'loss' ? 'Defeat' : 'Draw'}</h3>
              <p className="muted">by {result.reason}</p>
              <div className="row">
                <button className="btn primary" onClick={analyse}>Analyse this game</button>
                <button className="btn ghost" onClick={() => navigator.clipboard?.writeText(game.current.pgn())}>Copy PGN</button>
                {onExit && <button className="btn ghost" onClick={onExit}>{event ? 'Continue' : 'New game'}</button>}
              </div>
            </div>
          ) : (
            <div className="row">
              <button className="btn ghost small" onClick={() => finish('loss', 'resignation')}>Resign</button>
              <button className="btn ghost small" onClick={offerDraw}>Offer draw</button>
              {allowTakeback && <button className="btn ghost small" onClick={takeback} disabled={thinking || history.length < 1}>Take back</button>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

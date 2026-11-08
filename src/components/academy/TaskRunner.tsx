import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Board } from '../Board';
import type { ChoiceTask, PlayoutTask, PuzzleTask, SquareTask, Task } from '../../content/schema';
import { kpkAfter, probeKpk } from '../../chess/kpk';
import { engine } from '../../engine/stockfish';
import { api } from '../../academy/api';
import { taskById } from '../../academy/content';
import { applyServer, type State, type Toast } from '../../academy/store';

export interface AttemptResult { xp: number; credited: boolean; note: string }
export interface TaskOutcome { correct: boolean; result: AttemptResult | null; misses: number; unavailable?: string }

interface Props {
  task: Task;
  /** A spaced-revision review of an already-solved position. */
  review?: boolean;
  /** Treat the first wrong answer as final even in practice (Puzzle Rush). */
  oneTry?: boolean;
  /** Free practice outside the curriculum (generated positions): nothing is submitted. */
  practice?: boolean;
  onDone: (o: TaskOutcome) => void;
}

type Status = 'idle' | 'wrong' | 'solved' | 'failed';
type Mode = 'learn' | 'assess';
interface ServerReply { state?: State; toasts?: Toast[]; result?: AttemptResult; explanation?: string }

const sideName = (fen: string) => (fen.split(' ')[1] === 'w' ? 'White' : 'Black');
const orient = (t: { fen?: string; orientation?: 'white' | 'black' }) => t.orientation ?? (t.fen?.split(' ')[1] === 'b' ? 'black' : 'white');
const uciToMove = (uci: string) => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
const freeHints = (id: string) => taskById(id)?.stage === 'guided';

export function TaskRunner(props: Props) {
  const { task } = props;
  return (
    <div className="task">
      {task.kind === 'puzzle' && <PuzzleRunner key={task.id} {...props} task={task} />}
      {task.kind === 'choice' && <QuestionRunner key={task.id} {...props} task={task} />}
      {task.kind === 'square' && <QuestionRunner key={task.id} {...props} task={task} />}
      {task.kind === 'playout' && <PlayoutRunner key={task.id} {...props} task={task} />}
    </div>
  );
}

/** Opens one refereed attempt per mounted task (StrictMode-safe: refs survive the dev double-mount). */
function useAttempt(task: Task, review: boolean | undefined, onUnavailable: (msg: string) => void) {
  const started = useRef<Promise<{ attemptId: string; mode: Mode }> | null>(null);
  const [att, setAtt] = useState<{ id: string; mode: Mode } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    started.current ??= api.post('/api/attempts', { taskId: task.id, review: !!review });
    let live = true;
    started.current.then((r) => live && setAtt({ id: r.attemptId, mode: r.mode }), (e: Error) => { if (live) { setError(e.message); onUnavailable(e.message); } });
    return () => { live = false; };
  }, [task.id]);
  return { att, error };
}

function Hints({ task, attemptId, mode, shown, onShown }: { task: Task; attemptId?: string; mode?: Mode; shown: string[]; onShown: (h: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  if (mode !== 'learn' || !task.hints.length) return null;
  const free = freeHints(task.id);
  const more = async () => {
    if (!attemptId) return;
    setBusy(true);
    try { const r = await api.post<{ hint: string }>(`/api/attempts/${attemptId}/hint`); onShown([...shown, r.hint]); }
    catch { /* ignore */ }
    setBusy(false);
  };
  return (
    <div className="hints">
      {shown.map((h, i) => <p key={i} className="hint-line"><span className="hint-tag">Hint {i + 1}</span>{h}</p>)}
      {shown.length < task.hints.length && <button className="btn ghost small" onClick={more} disabled={busy || !attemptId}>{free ? 'Show a hint' : 'Show a hint (reduces XP)'}</button>}
    </div>
  );
}

function Feedback({ status, text }: { status: Status; text: string }) {
  if (!text) return null;
  return <div className={`feedback fb-${status}`} role="status">{text}</div>;
}

export function Difficulty({ d }: { d: number }) {
  return <span className="difficulty" aria-label={`Difficulty ${d} of 5`}>{'◆'.repeat(d)}<span className="dim">{'◆'.repeat(5 - d)}</span></span>;
}

function Unavailable({ text }: { text: string }) {
  return <div className="feedback fb-wrong" role="status">{text}</div>;
}

// ------------------------------------------------------------------ puzzle

interface MoveReply extends ServerReply { verdict: 'continue' | 'solved' | 'wrong' | 'failed'; played?: string; reply?: { san: string; from: string; to: string }; message: string; fen: string; solution?: string[] }

function PuzzleRunner({ task, review, oneTry, onDone }: Props & { task: PuzzleTask }) {
  const [fen, setFen] = useState(task.fen);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [history, setHistory] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const misses = useRef(0);
  const { att, error } = useAttempt(task, review, (m) => onDone({ correct: false, result: null, misses: 0, unavailable: m }));
  const solver = task.fen.split(' ')[1] === 'w' ? 'white' : 'black';
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const finish = (r: MoveReply, correct: boolean) => {
    applyServer(r);
    setStatus(correct ? 'solved' : 'failed');
    if (!correct && r.solution?.length) {
      const c = new Chess(task.fen);
      const mv = c.move(r.solution[0]);
      setFen(c.fen()); setLastMove([mv.from, mv.to]);
    }
    setMsg(correct ? `${r.message} ${r.explanation ?? ''}` : `${r.message} The solution: ${r.solution?.join(' ')}. ${r.explanation ?? ''}`);
    onDone({ correct, result: r.result ?? null, misses: misses.current });
  };

  const giveUp = async () => {
    if (!att) return;
    setBusy(true);
    try { finish({ ...(await api.post<MoveReply>(`/api/attempts/${att.id}/giveup`)), message: 'You chose to see the answer.' }, false); }
    catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  const onMove = async (uci: string) => {
    if (!att || busy || status === 'solved' || status === 'failed') return;
    const local = new Chess(fen);
    let mv;
    try { mv = local.move(uciToMove(uci)); } catch { return; }
    setFen(local.fen()); setLastMove([mv.from, mv.to]); setHistory((h) => [...h, mv.san]);
    setBusy(true);
    let r: MoveReply;
    try { r = await api.post<MoveReply>(`/api/attempts/${att.id}/move`, { uci }); }
    catch (e) { setBusy(false); setMsg((e as Error).message); return; }
    if (r.verdict === 'wrong' && oneTry) {
      misses.current++;
      const g = await api.post<MoveReply>(`/api/attempts/${att.id}/giveup`).catch(() => null);
      setBusy(false);
      return finish({ ...(g ?? r), message: r.message.replace(' Try again.', '') }, false);
    }
    if (r.verdict === 'solved' || r.verdict === 'failed') {
      if (r.reply) {
        // show the opponent's last reply before the verdict
        timer.current = window.setTimeout(() => { setFen(r.fen); setLastMove([r.reply!.from, r.reply!.to]); setHistory((h) => [...h, r.reply!.san]); setBusy(false); finish(r, r.verdict === 'solved'); }, 450);
        return;
      }
      setBusy(false);
      return finish(r, r.verdict === 'solved');
    }
    if (r.verdict === 'wrong') {
      misses.current++;
      setStatus('wrong'); setMsg(r.message);
      timer.current = window.setTimeout(() => { setFen(task.fen); setLastMove(undefined); setHistory([]); setBusy(false); }, 1100);
      return;
    }
    // continue: animate the reply
    timer.current = window.setTimeout(() => {
      if (r.reply) { setFen(r.fen); setLastMove([r.reply.from, r.reply.to]); setHistory((h) => [...h, r.reply!.san]); }
      setStatus('idle'); setMsg(r.message); setBusy(false);
    }, 450);
  };

  const done = status === 'solved' || status === 'failed';
  return (
    <div className="task-grid">
      <div className="task-board">
        <Board fen={fen} orientation={orient(task)} lastMove={lastMove} movable={done || busy || !att ? null : solver} onMove={onMove} label={task.prompt} />
      </div>
      <div className="task-side">
        <div className="task-meta"><span className="pill">{sideName(task.fen)} to move</span><Difficulty d={task.difficulty} />{task.themes.slice(0, 2).map((t) => <span key={t} className="pill subtle">{t}</span>)}</div>
        <h3 className="task-prompt">{task.prompt}</h3>
        {error && <Unavailable text={error} />}
        {!att && !error && <p className="small muted">Preparing the position…</p>}
        {history.length > 0 && <p className="moves-line">{history.join(' ')}</p>}
        <Feedback status={status} text={msg} />
        <Hints task={task} attemptId={att?.id} mode={att?.mode} shown={hints} onShown={setHints} />
        {!done && att?.mode === 'learn' && !oneTry && (
          <div className="row">
            <button className="btn ghost small" onClick={() => { setFen(task.fen); setLastMove(undefined); setHistory([]); setStatus('idle'); setMsg(''); }} disabled={busy || history.length === 0}>Restart</button>
            <button className="btn ghost small" onClick={giveUp} disabled={busy}>Show solution</button>
          </div>
        )}
        <p className="attrib">Objective: {task.objective}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ choice & square

interface AnswerReply extends ServerReply { verdict: 'wrong' | 'solved' | 'failed'; answer?: number; squares?: string[] }

function QuestionRunner({ task, review, oneTry, onDone }: Props & { task: ChoiceTask | SquareTask }) {
  const [picked, setPicked] = useState<number[]>([]);
  const [marks, setMarks] = useState<{ square: string; tone: 'good' | 'bad' | 'hint' }[]>([]);
  const [final, setFinal] = useState<AnswerReply | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const misses = useRef(0);
  const { att, error } = useAttempt(task, review, (m) => onDone({ correct: false, result: null, misses: 0, unavailable: m }));

  const submit = async (payload: { option?: number; square?: string }) => {
    if (!att || busy || final) return;
    setBusy(true);
    let r: AnswerReply;
    try { r = await api.post<AnswerReply>(`/api/attempts/${att.id}/answer`, payload); }
    catch (e) { setBusy(false); setMsg((e as Error).message); return; }
    if (r.verdict === 'wrong') {
      misses.current++;
      if (oneTry) {
        const g = await api.post<AnswerReply>(`/api/attempts/${att.id}/giveup`).catch(() => null);
        if (g) r = { ...g, verdict: 'failed' };
      } else {
        setBusy(false);
        if (payload.square) { setMarks([{ square: payload.square, tone: 'bad' }]); setMsg(`That square is ${payload.square}. Try again.`); }
        else setMsg('Not that one — think again.');
        return;
      }
    }
    setBusy(false);
    applyServer(r);
    setFinal(r);
    const correct = r.verdict === 'solved';
    if (task.kind === 'square') {
      const good = r.squares?.[0];
      setMarks([...(payload.square && !correct ? [{ square: payload.square, tone: 'bad' as const }] : []), ...(good ? [{ square: correct ? payload.square! : good, tone: 'good' as const }] : [])]);
      setMsg(correct ? `Correct — ${payload.square}. ${r.explanation}` : `The answer is ${good}. ${r.explanation}`);
    } else setMsg((correct ? 'Correct. ' : 'Not this time. ') + (r.explanation ?? ''));
    onDone({ correct, result: r.result ?? null, misses: misses.current });
  };

  const choose = (i: number) => { if (picked.includes(i) || final) return; setPicked([...picked, i]); void submit({ option: i }); };
  const status: Status = final ? (final.verdict === 'solved' ? 'solved' : 'failed') : misses.current ? 'wrong' : 'idle';
  const hasBoard = task.kind === 'square' || !!task.fen;

  return (
    <div className={hasBoard ? 'task-grid' : 'task-single'}>
      {hasBoard && <div className="task-board"><Board fen={task.fen!} orientation={orient(task)} onSquare={task.kind === 'square' ? (sq) => void submit({ square: sq }) : undefined} marks={marks} label={task.prompt} /></div>}
      <div className="task-side">
        <div className="task-meta"><span className="pill">{task.kind === 'square' ? 'Click a square' : 'Question'}</span><Difficulty d={task.difficulty} /></div>
        <h3 className="task-prompt">{task.prompt}</h3>
        {error && <Unavailable text={error} />}
        {task.kind === 'choice' && (
          <div className="options">
            {task.options.map((o, i) => {
              const cls = final && i === final.answer ? 'good' : picked.includes(i) ? 'bad' : '';
              return <button key={i} className={`option ${cls}`} onClick={() => choose(i)} disabled={!!final || !att || busy}>{o}</button>;
            })}
          </div>
        )}
        <Feedback status={status} text={msg} />
        <Hints task={task} attemptId={att?.id} mode={att?.mode} shown={hints} onShown={setHints} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ playout

function randomPick<T>(list: T[]): T { return list[Math.floor(Math.random() * list.length)]; }

/** KPK replies: the defender keeps the draw if possible; the attacker keeps the win and never hangs the pawn. */
function kpkReply(fen: string, role: 'defend' | 'attack'): string | null {
  const c = new Chess(fen);
  const moves = c.moves();
  if (!moves.length) return null;
  const scored = moves.map((san) => ({ san, out: kpkAfter(fen, san) }));
  if (role === 'defend') {
    const holds = scored.filter((s) => s.out === 'draw');
    return randomPick(holds.length ? holds : scored).san;
  }
  const wins = scored.filter((s) => s.out === 'win');
  if (wins.length) return randomPick(wins).san;
  const safe = scored.filter((s) => { const t = new Chess(fen); t.move(s.san); return !t.moves({ verbose: true }).some((m) => m.captured === 'p'); });
  return randomPick(safe.length ? safe : scored).san;
}

function PlayoutRunner({ task, practice, onDone }: Props & { task: PlayoutTask }) {
  const [fen, setFen] = useState(task.fen);
  const [lastMove, setLastMove] = useState<[string, string] | undefined>();
  const [history, setHistory] = useState<string[]>([]);
  const [used, setUsed] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const [thinking, setThinking] = useState(false);
  const [hints, setHints] = useState(0);
  const [restarts, setRestarts] = useState(0);
  const user = task.fen.split(' ')[1] === 'w' ? 'white' : 'black';
  const alive = useRef(true);
  const moves = useRef<string[]>([]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const end = async (ok: boolean, text: string) => {
    if (!ok) { setStatus('wrong'); setMsg(text + ' Restart to try again.'); return; }
    if (practice) { setStatus('solved'); setMsg(`${text} ${task.explanation}`); onDone({ correct: true, result: null, misses: restarts }); return; }
    setStatus('solved'); setMsg(`${text} Submitting to the referee…`);
    try {
      const r = await api.post<ServerReply>('/api/playouts', { taskId: task.id, moves: moves.current, restarts, hints });
      applyServer(r);
      setMsg(`${text} ${r.explanation ?? ''}`);
      onDone({ correct: true, result: r.result ?? null, misses: restarts });
    } catch (e) {
      setStatus('failed'); setMsg(`The referee rejected this game: ${(e as Error).message}`);
    }
  };

  const reply = async (c: Chess) => {
    setThinking(true);
    let san: string | null = null;
    if (task.opponent === 'kpk') san = kpkReply(c.fen(), task.goal === 'hold' ? 'attack' : 'defend');
    else {
      try {
        const uci = await engine.bestMove(c.fen(), { depth: 10 });
        if (uci) san = new Chess(c.fen()).move(uciToMove(uci)).san;
      } catch { /* engine unavailable */ }
      if (!san) san = randomPick(c.moves());
    }
    if (!alive.current || !san) return;
    const mv = c.move(san);
    moves.current.push(mv.san);
    setFen(c.fen()); setLastMove([mv.from, mv.to]); setHistory((h) => [...h, mv.san]); setThinking(false);
    if (task.goal === 'hold') {
      if (c.isGameOver()) return end(true, 'The game is drawn — you held!');
      if (mv.promotion) return end(false, 'The pawn has promoted.');
    }
    if (task.goal === 'mate' && c.isGameOver()) return end(false, 'The game ended without checkmate.');
  };

  const onMove = (uci: string) => {
    if (thinking || status !== 'idle') return;
    const c = new Chess(fen);
    let mv;
    try { mv = c.move(uciToMove(uci)); } catch { return; }
    const before = fen;
    const n = used + 1;
    moves.current.push(mv.san);
    setUsed(n); setFen(c.fen()); setLastMove([mv.from, mv.to]); setHistory((h) => [...h, mv.san]);
    if (task.goal === 'mate') {
      if (c.isCheckmate()) return void end(true, `Checkmate in ${n} moves!`);
      if (c.isStalemate()) return void end(false, 'Stalemate — the win slipped away. Leave the king a square unless you give check.');
      if (c.isDraw()) return void end(false, 'The game is drawn.');
      if (n >= task.maxMoves) return void end(false, `Move limit (${task.maxMoves}) reached without mate.`);
    } else if (task.goal === 'promote') {
      if (mv.promotion) {
        const ok = kpkAfter(before, mv.san) === 'win';
        return void end(ok, ok ? `Promoted safely in ${n} moves!` : 'The new piece can be captured or it is stalemate — not a win.');
      }
      const p = probeKpk(c.fen());
      if (!p || p.result !== 'win') return void end(false, 'That move lets the defence hold — with best play it is now a draw.');
      if (n >= task.maxMoves) return void end(false, `Move limit (${task.maxMoves}) reached.`);
    } else {
      const p = probeKpk(c.fen());
      if (!p) return void end(true, 'You captured the pawn — draw secured!');
      if (p.result === 'win') return void end(false, 'That move loses: White can now force promotion.');
      if (n >= task.maxMoves) return void end(true, `You held for ${task.maxMoves} moves with perfect accuracy.`);
    }
    void reply(c);
  };

  const restart = () => {
    moves.current = [];
    setFen(task.fen); setLastMove(undefined); setHistory([]); setUsed(0); setStatus('idle'); setMsg(''); setRestarts((r) => r + 1);
  };
  const goalText = task.goal === 'mate' ? 'Checkmate' : task.goal === 'promote' ? 'Promote safely' : 'Hold the draw';

  return (
    <div className="task-grid">
      <div className="task-board"><Board fen={fen} orientation={orient(task)} lastMove={lastMove} movable={status !== 'idle' || thinking ? null : user} onMove={onMove} label={task.prompt} /></div>
      <div className="task-side">
        <div className="task-meta"><span className="pill">Play-out · {goalText}</span><span className="pill subtle">Move {used}/{task.maxMoves}</span><Difficulty d={task.difficulty} /></div>
        <h3 className="task-prompt">{task.prompt}</h3>
        <p className="small muted">{task.opponent === 'kpk' ? 'Your opponent plays perfectly, using the exact king-and-pawn solver.' : 'Your opponent is Stockfish at full strength.'}</p>
        {thinking && <p className="small muted">Opponent is thinking…</p>}
        {history.length > 0 && <p className="moves-line">{history.join(' ')}</p>}
        <Feedback status={status} text={msg} />
        {task.hints.slice(0, hints).map((h, i) => <p key={i} className="hint-line"><span className="hint-tag">Hint {i + 1}</span>{h}</p>)}
        {hints < task.hints.length && status !== 'solved' && <button className="btn ghost small" onClick={() => setHints((h) => h + 1)}>Show a hint (reduces XP)</button>}
        {status !== 'solved' && <div className="row"><button className="btn ghost small" onClick={restart} disabled={thinking}>Restart</button></div>}
      </div>
    </div>
  );
}

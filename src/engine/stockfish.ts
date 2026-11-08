/**
 * Thin UCI wrapper around the Stockfish 16 WASM build served from /stockfish.
 * Everything returned here is an engine fact (depth, score, PV) — never mixed with lesson text.
 */
export interface EngineLine {
  multipv: number;
  depth: number;
  cp: number | null; // centipawns from White's point of view
  mate: number | null; // mate in N from White's point of view
  pv: string[]; // UCI moves
}

export interface Analysis {
  fen: string;
  depth: number;
  lines: EngineLine[];
  engine: string;
}

interface Job {
  fen: string;
  depth: number;
  multipv: number;
  searchmoves?: string[];
  /** Stockfish "Skill Level" 0-20 (20 = full strength). */
  skill?: number;
  movetime?: number;
  onUpdate?: (a: Analysis) => void;
  resolve: (a: Analysis) => void;
  reject: (e: unknown) => void;
}

const ENGINE_NAME = 'Stockfish 16 (WASM, single-threaded)';

export class StockfishEngine {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private queue: Job[] = [];
  private current: Job | null = null;
  private lines = new Map<number, EngineLine>();
  private cache = new Map<string, Analysis>();

  private start() {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker('/stockfish/stockfish-nnue-16-single.js');
      } catch (e) {
        reject(e);
        return;
      }
      this.worker.onerror = (e) => reject(e);
      this.worker.onmessage = (e: MessageEvent<string>) => {
        const msg = String(e.data);
        if (msg === 'readyok') resolve();
        else this.onLine(msg);
      };
      this.worker.postMessage('uci');
      this.worker.postMessage('setoption name Hash value 32');
      this.worker.postMessage('isready');
    });
    return this.ready;
  }

  private onLine(msg: string) {
    const job = this.current;
    if (!job) return;
    if (msg.startsWith('info') && msg.includes(' pv ')) {
      const depth = Number(/ depth (\d+)/.exec(msg)?.[1] ?? 0);
      const multipv = Number(/ multipv (\d+)/.exec(msg)?.[1] ?? 1);
      const cpM = / score cp (-?\d+)/.exec(msg);
      const mateM = / score mate (-?\d+)/.exec(msg);
      const pv = msg.split(' pv ')[1].trim().split(/\s+/);
      const flip = job.fen.split(' ')[1] === 'b' ? -1 : 1; // UCI scores are side-to-move relative
      this.lines.set(multipv, {
        multipv,
        depth,
        cp: cpM ? Number(cpM[1]) * flip : null,
        mate: mateM ? Number(mateM[1]) * flip : null,
        pv,
      });
      job.onUpdate?.(this.snapshot(job, depth));
    } else if (msg.startsWith('bestmove')) {
      const token = msg.split(/\s+/)[1];
      this.lastBest = token && token !== '(none)' ? token : null;
      const result = this.snapshot(job, job.depth);
      if (!job.searchmoves && (job.skill ?? 20) === 20 && !job.movetime) this.cache.set(this.key(job), result);
      this.current = null;
      job.resolve(result);
      this.next();
    }
  }

  private snapshot(job: Job, depth: number): Analysis {
    const lines = [...this.lines.values()].sort((a, b) => a.multipv - b.multipv);
    return { fen: job.fen, depth: Math.min(depth, ...lines.map((l) => l.depth)), lines, engine: ENGINE_NAME };
  }

  private key(job: Pick<Job, 'fen' | 'depth' | 'multipv' | 'searchmoves' | 'skill' | 'movetime'>) {
    return `${job.fen}|${job.depth}|${job.multipv}|${job.searchmoves?.join(',') ?? ''}|${job.skill ?? 20}|${job.movetime ?? ''}`;
  }

  private next() {
    if (this.current || !this.queue.length || !this.worker) return;
    const job = this.queue.shift()!;
    this.current = job;
    this.lines.clear();
    this.worker.postMessage('ucinewgame');
    this.worker.postMessage(`setoption name MultiPV value ${job.multipv}`);
    this.worker.postMessage(`setoption name Skill Level value ${job.skill ?? 20}`);
    this.worker.postMessage(`position fen ${job.fen}`);
    const limit = job.movetime ? `movetime ${job.movetime}` : `depth ${job.depth}`;
    this.worker.postMessage(`go ${limit}${job.searchmoves ? ' searchmoves ' + job.searchmoves.join(' ') : ''}`);
  }

  /** A playing move. With skill < 20 Stockfish deliberately chooses weaker moves. */
  async bestMove(fen: string, opts: { skill?: number; depth?: number; movetime?: number } = {}): Promise<string | null> {
    // With Skill Level < 20 Stockfish's choice can differ from PV[0], so the
    // "bestmove" token is captured directly when the search finishes.
    await this.start();
    return new Promise<string | null>((resolve, reject) => {
      this.queue.push({
        fen, depth: opts.depth ?? 12, multipv: 1, skill: opts.skill ?? 20, movetime: opts.movetime,
        resolve: () => resolve(this.lastBest), reject,
      });
      this.next();
    });
  }

  private lastBest: string | null = null;

  async analyse(
    fen: string,
    opts: { depth?: number; multipv?: number; searchmoves?: string[]; onUpdate?: (a: Analysis) => void } = {},
  ): Promise<Analysis> {
    const job = { fen, depth: opts.depth ?? 16, multipv: opts.multipv ?? 3, searchmoves: opts.searchmoves };
    const cached = this.cache.get(this.key(job));
    if (cached) return cached;
    await this.start();
    return new Promise<Analysis>((resolve, reject) => {
      this.queue.push({ ...job, onUpdate: opts.onUpdate, resolve, reject });
      this.next();
    });
  }

  /** Drop queued work (e.g. user navigated away) and stop the current search. */
  cancelPending() {
    for (const j of this.queue) j.reject(new Error('cancelled'));
    this.queue = [];
    if (this.current) this.worker?.postMessage('stop');
  }

  get name() {
    return ENGINE_NAME;
  }
}

export const engine = new StockfishEngine();
/** A second worker for playing games, so analysis never cancels a game move. */
export const playEngine = new StockfishEngine();

export function formatScore(line: Pick<EngineLine, 'cp' | 'mate'>): string {
  if (line.mate !== null) return `${line.mate > 0 ? '+' : '-'}M${Math.abs(line.mate)}`;
  if (line.cp === null) return '…';
  return `${line.cp >= 0 ? '+' : ''}${(line.cp / 100).toFixed(2)}`;
}

/** Score in pawns from `side`'s point of view, mates clamped to ±100. */
export function scoreFor(line: Pick<EngineLine, 'cp' | 'mate'>, side: 'w' | 'b'): number {
  const s = line.mate !== null ? Math.sign(line.mate) * 100 : (line.cp ?? 0) / 100;
  return side === 'w' ? s : -s;
}

export type Verdict = 'ok' | 'inaccuracy' | 'mistake' | 'blunder';

export interface MoveCheck {
  uci: string;
  best: EngineLine;
  played: EngineLine;
  loss: number; // pawns lost vs engine's best, from the mover's point of view
  verdict: Verdict;
  depth: number;
}

/** Compare a repertoire move with the engine's best. Read-only: it never changes the repertoire. */
export async function checkMove(fenBefore: string, uci: string, depth = 14): Promise<MoveCheck> {
  const side = fenBefore.split(' ')[1] as 'w' | 'b';
  const best = await engine.analyse(fenBefore, { depth, multipv: 1 });
  const bestLine = best.lines[0];
  const played = bestLine.pv[0] === uci ? best : await engine.analyse(fenBefore, { depth, multipv: 1, searchmoves: [uci] });
  const playedLine = played.lines[0];
  const loss = Math.max(0, scoreFor(bestLine, side) - scoreFor(playedLine, side));
  const verdict: Verdict = loss >= 2 ? 'blunder' : loss >= 1 ? 'mistake' : loss >= 0.5 ? 'inaccuracy' : 'ok';
  return { uci, best: bestLine, played: playedLine, loss, verdict, depth: Math.min(best.depth, played.depth) };
}

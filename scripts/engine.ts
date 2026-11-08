// Stockfish 16 (NNUE) in Node, for authoring and verification. Not used by the browser or server.
//
// The npm build is an Emscripten module: commands go in through onCustomMessage() and UCI
// output comes back through addMessageListener(). It reads the NNUE network relative to the
// current directory, so the process changes into the engine folder while the network loads.
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { Chess } from 'chess.js';
import { fenProblem } from '../src/chess/fen.ts';

const require = createRequire(import.meta.url);
const ENGINE_DIR = dirname(require.resolve('stockfish/src/stockfish-nnue-16-single.js'));

interface Raw { onCustomMessage(cmd: string): void; addMessageListener(fn: (line: string) => void): void }

export interface EngineLine {
  uci: string;
  san: string;
  /** Centipawns from the side to move's point of view (null when mate is reported). */
  cp: number | null;
  /** Mate in N for the side to move (negative: being mated). */
  mate: number | null;
  depth: number;
  pv: string[];
}

/** One comparable number in pawns, side-to-move view: mates map to ±(100 - distance/100). */
export const valueOf = (l: Pick<EngineLine, 'cp' | 'mate'>) => (l.mate !== null ? Math.sign(l.mate) * (100 - Math.abs(l.mate) / 100) : (l.cp ?? 0) / 100);

export class NodeEngine {
  private sf!: Raw;
  private listeners: ((line: string) => void)[] = [];
  readonly name = 'Stockfish 16 NNUE (WASM, single-threaded)';

  static async start(hashMb = 64): Promise<NodeEngine> {
    const e = new NodeEngine();
    const factory = require(join(ENGINE_DIR, 'stockfish-nnue-16-single.js'))();
    e.sf = await factory({ locateFile: (f: string) => join(ENGINE_DIR, f.includes('.wasm') ? 'stockfish-nnue-16-single.wasm' : f) });
    e.sf.addMessageListener((line: string) => { for (const l of [...e.listeners]) l(String(line)); });
    const cwd = process.cwd();
    process.chdir(ENGINE_DIR); // the network file is read relative to the working directory
    try {
      await e.request(['uci'], (l) => l === 'uciok');
      e.send(`setoption name Hash value ${hashMb}`);
      e.send('setoption name Use NNUE value true');
      let nnue = false;
      await e.request(['isready'], (l) => { if (l.includes('NNUE evaluation') && l.includes('enabled')) nnue = true; return l === 'readyok'; });
      // the network loads lazily on the first search: run a tiny one while still in the engine folder
      await e.request(['position startpos', 'go depth 1'], (l) => { if (l.includes('NNUE evaluation') && l.includes('enabled')) nnue = true; return l.startsWith('bestmove'); });
      if (!nnue) throw new Error('Stockfish started without its NNUE network; refusing to certify with the classical evaluation.');
    } finally {
      process.chdir(cwd);
    }
    return e;
  }

  private send(cmd: string) { this.sf.onCustomMessage(cmd); }

  private request(cmds: string[], done: (line: string) => boolean, onLine?: (line: string) => void): Promise<void> {
    return new Promise((resolve) => {
      const fn = (line: string) => {
        onLine?.(line);
        if (done(line)) { this.listeners = this.listeners.filter((x) => x !== fn); resolve(); }
      };
      this.listeners.push(fn);
      for (const c of cmds) this.send(c);
    });
  }

  /** Analyse a position: the top `multipv` moves at the given depth, best first. */
  async analyse(fen: string, depth: number, multipv: number): Promise<EngineLine[]> {
    const problem = fenProblem(fen);
    if (problem) throw new Error(`Refusing to analyse an illegal position: ${problem}`);
    const legal = new Chess(fen).moves().length;
    const k = Math.max(1, Math.min(multipv, legal));
    const lines = new Map<number, EngineLine>();
    this.send('ucinewgame');
    this.send(`setoption name MultiPV value ${k}`);
    await this.request(['isready'], (l) => l === 'readyok');
    await this.request([`position fen ${fen}`, `go depth ${depth}`], (l) => l.startsWith('bestmove'), (l) => {
      if (!l.startsWith('info') || !l.includes(' pv ')) return;
      const d = Number(/ depth (\d+)/.exec(l)?.[1] ?? 0);
      const mpv = Number(/ multipv (\d+)/.exec(l)?.[1] ?? 1);
      const cp = / score cp (-?\d+)/.exec(l);
      const mate = / score mate (-?\d+)/.exec(l);
      if (/ (lowerbound|upperbound)/.test(l)) return;
      const pv = l.split(' pv ')[1].trim().split(/\s+/);
      lines.set(mpv, { uci: pv[0], san: '', cp: cp ? Number(cp[1]) : null, mate: mate ? Number(mate[1]) : null, depth: d, pv });
    });
    const out = [...lines.entries()].sort((a, b) => a[0] - b[0]).map(([, l]) => l);
    for (const l of out) {
      const c = new Chess(fen);
      l.san = c.move({ from: l.uci.slice(0, 2), to: l.uci.slice(2, 4), promotion: l.uci[4] }).san;
    }
    return out;
  }

  /** Evaluate every legal move (searchmoves one at a time is slow; MultiPV over all moves is exact enough). */
  analyseAll(fen: string, depth: number) {
    return this.analyse(fen, depth, 500);
  }
}

/** A small pool of referee worker threads with a timeout per job. */
import { Worker } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import type { MoveJudgement, Mode, PuzzleSession } from '../src/chess/judge.ts';

interface Pending { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }

export class JudgePool {
  private workers: Worker[] = [];
  private pending = new Map<number, Pending>();
  private next = 0;
  private rr = 0;
  private timeoutMs: number;

  constructor(size = Math.max(1, Math.min(2, availableParallelism() - 1)), timeoutMs = 10_000) {
    this.timeoutMs = timeoutMs;
    for (let i = 0; i < size; i++) this.spawn(i);
  }

  private spawn(i: number) {
    const w = new Worker(new URL('./judge-worker.ts', import.meta.url));
    w.unref(); // never keep the process alive on its own
    w.on('message', (m: { id: number; ok: boolean; result?: unknown; error?: string }) => {
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.ok) p.resolve(m.result); else p.reject(new Error(m.error));
    });
    w.on('error', () => { this.workers[i] = undefined as unknown as Worker; this.spawn(i); });
    this.workers[i] = w;
  }

  private run<T>(msg: Record<string, unknown>): Promise<T> {
    const id = ++this.next;
    const w = this.workers[this.rr++ % this.workers.length];
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('The referee took too long. Please try again.')); }, this.timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      w.postMessage({ ...msg, id });
    });
  }

  move(taskId: string, session: PuzzleSession, uci: string, mode: Mode) {
    return this.run<MoveJudgement>({ kind: 'move', taskId, session, uci, mode });
  }
  playout(taskId: string, moves: unknown) {
    return this.run<{ ok: boolean; reason: string }>({ kind: 'playout', taskId, moves });
  }
  async close() { await Promise.all(this.workers.map((w) => w?.terminate())); }
}

/**
 * The referee's heavy work, off the main thread: judging a puzzle move (which may run a
 * mate search or build the K+P solver table) and verifying a play-out. The main thread
 * stays free to answer other requests meanwhile.
 */
import { parentPort } from 'node:worker_threads';
import { judgeMove, verifyPlayout, type Mode, type PuzzleSession } from '../src/chess/judge.ts';
import { probeKpk } from '../src/chess/kpk.ts';
import { fullTask } from './content.ts';

type Request =
  | { id: number; kind: 'move'; taskId: string; session: PuzzleSession; uci: string; mode: Mode }
  | { id: number; kind: 'playout'; taskId: string; moves: unknown };

// build the K+P solver table once, up front, so no request pays for it
probeKpk('8/8/8/3k4/8/8/3PK3/8 w - - 0 1');

parentPort!.on('message', (req: Request) => {
  try {
    const task = fullTask(req.taskId);
    if (!task) throw new Error('Unknown position.');
    if (req.kind === 'move') {
      if (task.kind !== 'puzzle') throw new Error('Not a board puzzle.');
      parentPort!.postMessage({ id: req.id, ok: true, result: judgeMove(task, req.session, req.uci, req.mode) });
    } else {
      if (task.kind !== 'playout') throw new Error('Not a play-out.');
      parentPort!.postMessage({ id: req.id, ok: true, result: verifyPlayout(task, req.moves) });
    }
  } catch (e) {
    parentPort!.postMessage({ id: req.id, ok: false, error: (e as Error).message });
  }
});

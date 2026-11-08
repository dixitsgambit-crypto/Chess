import { useState } from 'react';
import type { Task } from '../../content/schema';
import { TaskRunner, type TaskOutcome } from './TaskRunner';

export interface SeqResult { task: Task; outcome: TaskOutcome }

interface Props {
  tasks: Task[];
  /** Assessments (exam, guardian, placement, review) cannot be skipped once opened. */
  assess?: boolean;
  /** Spaced-revision reviews. */
  review?: boolean;
  onFinish: (results: SeqResult[]) => void;
  finishLabel?: string;
}

export function TaskSequence({ tasks, assess, review, onFinish, finishLabel = 'Continue' }: Props) {
  const [i, setI] = useState(0);
  const [results, setResults] = useState<SeqResult[]>([]);
  const [current, setCurrent] = useState<SeqResult | null>(null);
  if (!tasks.length) return <div className="empty">Nothing to do here right now.</div>;
  const task = tasks[i];

  const done = (outcome: TaskOutcome) => {
    const r = { task, outcome };
    setCurrent(r);
    setResults((rs) => [...rs, r]);
  };
  const next = (all = results) => {
    setCurrent(null);
    if (i + 1 < tasks.length) setI(i + 1);
    else onFinish(all);
  };
  const skip = () => {
    const all = [...results, { task, outcome: { correct: false, result: null, misses: 0 } }];
    setResults(all);
    next(all);
  };

  return (
    <div className="sequence">
      <div className="seq-head">
        <span className="seq-count">Position {i + 1} of {tasks.length}</span>
        <div className="seq-dots" aria-hidden>
          {tasks.map((t, k) => {
            const r = results.find((x) => x.task.id === t.id);
            return <span key={t.id} className={`dot ${k === i ? 'now' : ''} ${r ? (r.outcome.correct && r.outcome.misses === 0 ? 'ok' : r.outcome.correct ? 'meh' : 'bad') : ''}`} />;
          })}
        </div>
      </div>
      <TaskRunner key={task.id + ':' + i} task={task} review={review} onDone={done} />
      {current && (
        <div className="seq-foot">
          {current.outcome.result?.note && <span className="small muted">{current.outcome.result.note}</span>}
          {(current.outcome.result?.xp ?? 0) > 0 && <span className="xp-chip">+{current.outcome.result!.xp} XP</span>}
          <button className="btn primary" onClick={() => next()} autoFocus>{i + 1 < tasks.length ? 'Next position' : finishLabel}</button>
        </div>
      )}
      {!current && !assess && (
        <div className="seq-foot subtle-foot">
          <button className="btn ghost small" onClick={skip}>Skip for now</button>
        </div>
      )}
    </div>
  );
}

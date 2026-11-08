/**
 * The curriculum as the browser sees it: identical structure, but every secret
 * removed — solutions, accepted alternatives, answers, explanations and hint text.
 * Hints and explanations are revealed one at a time by the referee.
 */
import { KINGDOMS, allTasks } from '../src/content/kingdoms.ts';
import { PLACEMENT } from '../src/content/placement.ts';
import type { Kingdom, Task } from '../src/content/schema.ts';

export function redactTask(t: Task): Task {
  const base = { ...t, explanation: '', hints: t.hints.map(() => '') };
  switch (t.kind) {
    case 'puzzle': {
      const goal = t.goal.type === 'material' ? { type: 'material' as const, minGain: 0, depth: 0 } : t.goal;
      return { ...base, kind: 'puzzle', fen: t.fen, solution: [], accept: undefined, goal, orientation: t.orientation };
    }
    case 'choice': return { ...base, kind: 'choice', options: t.options, answer: -1 };
    case 'square': return { ...base, kind: 'square', fen: t.fen, answer: [] };
    case 'playout': return { ...t, explanation: '' };
  }
}

function redactKingdom(k: Kingdom): Kingdom {
  return {
    ...k,
    lessons: k.lessons.map((l) => ({
      ...l,
      guided: l.guided.map(redactTask),
      independent: l.independent.map(redactTask),
      application: l.application.map(redactTask),
      exam: l.exam.map(redactTask),
    })),
    boss: k.boss && { ...k.boss, tasks: k.boss.tasks.map(redactTask) },
  };
}

let cached: string | null = null;
export function publicContent(): string {
  cached ??= JSON.stringify({
    kingdoms: KINGDOMS.map(redactKingdom),
    placement: PLACEMENT.map((p) => ({ ...p, task: redactTask(p.task) })),
  });
  return cached;
}

let index: Map<string, Task> | null = null;
export function fullTask(id: string): Task | undefined {
  if (!index) {
    index = new Map(allTasks().map((r) => [r.task.id, r.task]));
    for (const p of PLACEMENT) index.set(p.task.id, p.task);
  }
  return index.get(id);
}

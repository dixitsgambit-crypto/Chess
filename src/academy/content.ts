/**
 * The curriculum in the browser, loaded from the server with every answer removed
 * (no solutions, answers, explanations or hint text). The browser never imports
 * src/content/* directly, so none of that reaches the public bundle.
 *
 * These are live ES-module bindings: they are filled once by loadContent() before
 * the app renders, then read synchronously everywhere.
 */
import type { Kingdom, KingdomId, Lesson, Task } from '../content/schema';
import { api } from './api';

export type Stage = 'guided' | 'independent' | 'application' | 'exam' | 'boss' | 'placement';
export interface TaskRef { task: Task; stage: Stage; lessonId?: string; kingdomId: string }
export interface PlacementItem { task: Task; kingdom: KingdomId; lessons: string[] }

export let KINGDOMS: Kingdom[] = [];
export let ALL_LESSONS: Lesson[] = [];
export let PLACEMENT: PlacementItem[] = [];
let refs: TaskRef[] = [];

export async function loadContent() {
  const c = await api.get<{ kingdoms: Kingdom[]; placement: PlacementItem[] }>('/api/content');
  KINGDOMS = c.kingdoms;
  ALL_LESSONS = KINGDOMS.flatMap((k) => k.lessons);
  PLACEMENT = c.placement;
  refs = [];
  for (const k of KINGDOMS) {
    for (const l of k.lessons) for (const stage of ['guided', 'independent', 'application', 'exam'] as const) for (const task of l[stage]) refs.push({ task, stage, lessonId: l.id, kingdomId: k.id });
    for (const task of k.boss?.tasks ?? []) refs.push({ task, stage: 'boss', kingdomId: k.id });
  }
}

export const lessonById = (id: string) => ALL_LESSONS.find((l) => l.id === id);
export const kingdomById = (id: string) => KINGDOMS.find((k) => k.id === id);
export const allTasks = () => refs;
export const taskById = (id: string) => refs.find((r) => r.task.id === id);

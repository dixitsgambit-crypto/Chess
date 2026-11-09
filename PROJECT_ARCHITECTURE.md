# Project architecture

_Last updated: 2026-11-08 (Phase 1)._

## Overview

```
Browser (React SPA)                         Node 24 server (server/)                 SQLite (data/chessverse.db)
───────────────────                         ────────────────────────                 ───────────────────────────
academy/content.ts  ── GET /api/content ──▶ content.ts (curriculum, answers removed)
TaskRunner          ── POST /api/attempts ▶ app.ts ──▶ judge-pool ──▶ judge-worker   attempts
   (moves/answers)  ── …/move, …/answer ──▶   referee (src/chess/judge.ts, workers)
store.ts            ◀─ state + toasts ───── rules.ts (the ONLY code that awards)      progress (JSON per player)
OpeningLab (lab.ts) ── GET/PUT /api/lab ──▶ lab.ts validation                         lab_data
Account UI          ── /api/auth, /account▶ auth.ts (scrypt, sessions)                users, sessions
Stockfish (WASM)    (analysis & play, in the browser; not trusted for scoring)
```

## Layers

| Layer | Location | Notes |
|---|---|---|
| UI | `src/components/`, `src/components/academy/`, `src/OpeningLab.tsx` | React 18 + TypeScript, chessground board, hash router (`src/academy/router.ts`). |
| Browser state | `src/academy/store.ts`, `lab.ts`, `content.ts`, `api.ts` | Holds the server's copy of progress; never awards anything. Content arrives with answers removed. |
| Shared, content-free rules | `src/academy/progression.ts` | State shape, levels, titles, missions, achievements, unlock map, retry rule. Imported by both sides. |
| Chess logic | `src/chess/` | `search.ts` (mate & material search), `kpk.ts` (exact K+P solver), `judge.ts` (referee), `fen.ts` (strict FEN check), `observe.ts` (rule-based facts). |
| Curriculum | `src/content/` | Lessons, guardians, placement, master games, engine certificates. **Imported by the server and scripts only** — never by browser code. |
| Server | `server/` | `app.ts` routes, `db.ts` store, `migrations.ts`, `backup.ts`, `auth.ts`, `rules.ts`, `content.ts`, `lab.ts`, `judge-pool.ts` + `judge-worker.ts`, `log.ts`, `index.ts` (start-up, housekeeping, backups). |
| Authoring tools | `scripts/` | `validate-content.ts`, `verify-engine.ts` + `engine.ts` (Stockfish NNUE in Node), `mine-positions.ts`, `mine-engine.ts`, `backup.ts`, `dev.mjs`. |

## Request flow for a puzzle move

1. Browser opens an attempt: `POST /api/attempts {taskId}`. The server decides the stage (guided / independent / exam…) from the content, not from the client.
2. Each move: `POST /api/attempts/:id/move {uci}`. The server snapshots the attempt, judges the move **in a worker thread**, then applies the result in one transaction — only if the attempt is unchanged.
3. When the attempt ends, `rules.ts` records it (XP, credit, review schedule, missions, achievements, mastery, unlocks) and the explanation/solution is revealed.

## Engines

- **Browser:** Stockfish 16 WASM (single-threaded, classical evaluation) in two workers — analysis and play.
- **Node (authoring only):** Stockfish 16 with its NNUE network via `scripts/engine.ts`, used to certify engine-goal puzzles and audit content. Not used per request.

## Deployment shape

One Node process serves the API and the built site (`npm start`), with a persistent directory for the database and backups. See `Dockerfile` (written, not yet built — see KNOWN_LIMITATIONS.md).

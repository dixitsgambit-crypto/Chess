# Chessverse Academy

*The Complete Journey of a Chess Player.* A gamified chess education platform:
Learn → Understand → Practise → Apply → Master.

Requires Node 24 (uses the built-in `node:sqlite` and TypeScript type stripping; no database to install).

```
npm install
npm run dev        # API server on :8787 + site on http://localhost:5173 (proxied /api)
npm test           # PGN check + curriculum verification + all server tests (34)
npm run validate   # curriculum verification with per-position detail
npm run build      # type-checks browser and server, builds dist/
npm start          # production: one server on $PORT (default 8787) serving dist/ and the API
npm run backup     # consistent backup into data/backups (safe while running)
```

Production environment variables: `PORT`, `CHESSVERSE_DB` (SQLite file, default `data/chessverse.db`),
`CHESSVERSE_BACKUPS` (default `data/backups`), `CHESSVERSE_KEEP_BACKUPS` (default 14),
`COOKIE_SECURE=1` (behind HTTPS; also sends HSTS), `TRUST_PROXY=1` (only behind a real reverse proxy),
`SOURCE_URL` (public link to the source — required by the GPL before public hosting), `LOG_LEVEL`.

**Sharing with ngrok:** build, then `npm start`, then `ngrok http 8787` (not port 80, and not the dev server).
Set `COOKIE_SECURE=1` and `TRUST_PROXY=1` for that. Everything runs on your PC while ngrok is open.

**Licence:** GPL-3.0-or-later — see `LICENSE` and `THIRD_PARTY_NOTICES.md`.

## Project documents
`PROJECT_ARCHITECTURE.md` · `CURRICULUM_MAP.md` · `DATABASE_SCHEMA.md` · `FEATURE_STATUS.md` ·
`DEVELOPMENT_ROADMAP.md` · `TESTING_REPORT.md` · `SECURITY_REVIEW.md` · `CHANGELOG.md` · `KNOWN_LIMITATIONS.md`

## Server and server-side XP (milestone 2)

The server (`server/`) owns every player's progress. The browser can ask for things; only
`server/rules.ts` decides what is awarded, using the server's clock.

- **Answers never reach the browser.** `/api/content` sends the curriculum with solutions, accepted
  alternatives, answers, explanations and hint text removed (`server/content.ts`); the built bundle
  contains none of them. Explanations and solutions are revealed only when an attempt ends.
- **Every attempt is refereed move by move** (`src/chess/judge.ts`): the browser opens an attempt, sends each
  move or answer, and the server judges it, plays the opponent's reply, counts misses and hands out hints
  one at a time (counted). XP is computed from that server-side record.
- **Assessments:** an exam/guardian/placement position counts as attempted the moment it is opened;
  walking away or refreshing is recorded as a miss. Retries are refused for 20 hours. Placement is scored
  from the referee's records and can be taken once.
- **Play-outs** are submitted as full move lists and replayed. Against the exact K+P solver the opponent's
  moves are checked too, so a forged game with a blundering opponent is rejected. Against Stockfish only
  legality, the goal and the move limit are proven (Stockfish is not run per request on the server).
- **Games, guess-the-move, tournaments:** PGNs must replay legally from the start and match their stated
  result where the board decides it (mate, stalemate, repetition…). Guess-the-move is scored by the server
  from the guesses. Cup rounds are filled in from recorded games, not from client claims.
- **Accounts:** a visitor starts as a guest (progress is already on the server) and can create an account to
  keep it. scrypt password hashing, random session tokens stored hashed, HttpOnly SameSite cookies,
  rate-limited auth, JSON-only writes with an Origin check (CSRF), a strict CSP, 64 KB request limit.
  Progress can be exported but not imported.

What the server **cannot** prove (by design, and stated here so nobody relies on it):
results decided off the board (resignation, time forfeit, agreed draws) and the moves of Stockfish in
engine games and Stockfish play-outs — a determined user could fabricate those. They award achievements
and missions but no direct XP. Puzzle Rush scores are also self-reported (no XP).

## What is in this milestone (frontend vertical slice)

| Section | Status |
|---|---|
| Home dashboard | Continue-learning, daily missions, weekly challenges, revision due, kingdom progress |
| Chess Academy | 10 kingdoms; **22 published lessons** (Foundation 8, Tactics 8, Calculation 2, Endgames 4), 4 guardian battles, placement assessment |
| Kingdom Map | Illustrated SVG map: open / sealed / conquered / in preparation |
| AI Grandmaster | Analysis board (FEN/PGN import-export, undo, saved variations, Stockfish lines, move review, rule-computed observations) and play vs Stockfish (skill 0–20, clocks, resign, draw offers) |
| Training Grounds | Spaced revision, theme drills, Puzzle Rush |
| Opening Laboratory | The PGN repertoire studio (lessons, practice, explorer, quizzes, notes); structured opening courses listed as in preparation |
| Endgame Citadel | Opposition, key squares, distant opposition, rook endings (Lucena & Philidor, Stockfish-certified), Warden battle, K+P trainer |
| Master Games | Opera Game, Immortal Game, Evergreen Game; replay + Guess-the-Move |
| Tournament Hall | Kingdom Cup: 3 rounds vs rising engine personas under a clock |
| Progress, Achievements, Profile, Settings | Mastery tables, XP log, 17 achievements, titles, board cosmetics, reduced motion, export/import/reset |

Kingdoms 3, 4, 7, 8, 9 and 10 show their full topic lists but have no lessons yet; they are labelled
“in preparation” rather than showing buttons that do nothing.

### Authoring new positions: `scripts/mine-positions.ts`

```
node --experimental-strip-types scripts/mine-positions.ts mate2 300 42     # unique mates in two
node --experimental-strip-types scripts/mine-positions.ts kpk 300           # one-move K+P wins/draws
node --experimental-strip-types scripts/mine-positions.ts material 300 7   # unique material-winning tactics
```

The miner searches random positions for exercises with exactly one solution and prints the main line.
Authors still choose the instructive ones and write the explanations; the validator re-checks every
position, and every claim in an explanation should match the lines it reports.

### Engine certification: `npm run verify:engine`

For positions the exact checkers cannot prove (rook endings, “best move” positions), a puzzle can use
`goal: { type: 'engine', mode: 'best' | 'win' | 'draw', margin, depth }`.

- `npm run verify:engine` runs **Stockfish 16 with its NNUE network, in Node** (`scripts/engine.ts`), evaluates
  every legal move, and writes `src/content/engine-certificates.json`. A puzzle is certified only if the moves
  the engine accepts (within 0.25 of best / still winning ≥ +2.5 / still holding ≥ −0.6) are **exactly** the
  declared solution + `accept`, and every other move is at least `margin` pawns worse.
- Demonstrations whose captions make engine-level claims set `demo.verify`; every move by the certified side
  must keep the result.
- Certificates are fingerprinted. Change a puzzle and `npm test` fails with “certificate is stale” until it is
  re-certified. The engine runs only at authoring time; the server referees from the certified answers.
- `npm run verify:engine -- --audit` also gives a Stockfish second opinion on every mate and material
  puzzle. The first audit flagged one puzzle (a capture that led to a dead draw), now fixed.
- `scripts/mine-engine.ts` searches rook-ending templates for positions with only a few correct moves.

This is strong evidence, not proof: it is the engine’s judgement at the certified depth (20 for the current
rook-ending puzzles). The in-browser analysis board uses the same engine without the 40 MB network
(classical evaluation) to keep downloads small.

Still not covered: strategic “best plan” lessons (quiet positional moves rarely clear a safe engine margin,
so they need hand-curated positions from real games) and opening trees (need verified sources).

## Lesson engine

Every lesson runs eight stages covering the spec’s twelve requirements: introduction & objectives, concept,
demonstration, guided practice, independent practice, practical application, examination, and a
feedback / mastery / revision report. Task kinds: board puzzles, multiple choice, click-a-square, and
play-outs against Stockfish or the exact K+P solver. Promotion piece picker, legal-move highlighting,
click or drag moves.

## How content is verified (`scripts/validate-content.ts`)

Every position is checked before it ships:

- FEN legality and every solution move replayed with chess.js.
- **Mate** puzzles: a mate search confirms the mate length, that no shorter mate exists, and lists
  every accepted first move (the runtime accepts any forced mate, not only the listed one).
- **Material** puzzles: a material search (with capture quiescence) confirms the gain and fails if any
  *unlisted* move also wins — so puzzles are unambiguous.
- **K+P endings**: an exact king-and-pawn solver (`src/chess/kpk.ts`) confirms the result; at runtime any
  move that keeps the result is accepted.
- Exam, guardian and placement positions must not appear anywhere else (truly unseen).
- Master-game PGNs must replay to their recorded finish.

## XP and mastery rules (`src/academy/store.ts`)

- No XP for reading, demonstrations or re-solving anything already solved.
- Guided: 2 XP. Independent/application: full XP only for a first-attempt, hint-free solve; hints or
  misses reduce it.
- Exam/guardian positions are credited at the first attempt only. A missed position can be credited only
  after a 20-hour gap (retention, not memorisation). Mastery = credit on every exam position.
- Spaced revision (1 day, then growing intervals) awards XP only for due, correct reviews.
- Titles are fictional game ranks; nothing claims an official title or rating.

These rules run on the server (see above).

## Layout

- `server/` HTTP API (`app.ts`), SQLite store (`db.ts`), auth (`auth.ts`), award rules (`rules.ts`), content redaction (`content.ts`), API tests (`test/`)
- `src/chess/judge.ts` the referee (server-only)
- `src/academy/progression.ts` shared, content-free definitions (levels, titles, missions, achievements)
- `src/academy/content.ts` / `api.ts` / `store.ts` the browser's view: redacted content and server state
- `src/content/` curriculum data (schema, kingdoms, lessons, placement, master games) — imported by the server and the validator only
- `src/chess/` mate/material search, exact K+P solver, position observations
- `src/academy/` progress store, router, motion preference
- `src/components/academy/` shell and every section
- `src/components/Board.tsx` shared chessground board
- `src/OpeningLab.tsx`, `src/pgn/`, `src/repertoire/`, `src/lessons/` the PGN repertoire studio
- `src/engine/stockfish.ts` Stockfish 16 WASM (separate workers for analysis and play)

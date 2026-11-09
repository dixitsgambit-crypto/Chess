# Development roadmap

_Last updated: 2026-11-08. One phase at a time; each ends with tests, a manual test guide and updated documents._

| Phase | Scope | Complexity | Status |
|---|---|---|---|
| 0 | Full audit | — | Done |
| 1 | Stabilise and secure: migrations, backups, housekeeping, account management, Laboratory on the server, worker referee, compression, logging, licences, Dockerfile, tests, documents | M–L | **Done** (Linux/Docker run pending) |
| 2 | Complete the ten-kingdom curriculum (quality over quantity) | XL, ongoing | Next |
| 3 | Personal Grandmaster: PGN upload, Stockfish analysis queue, error categories, strength profile, training plans, 7/30-day retention checks | L–XL | Planned |
| 4 | Calculation Arena, Defence Kingdom, Opening War Room | L | Planned |
| 5 | Master Games expansion, Swiss tournament simulator | M–L | Planned |
| 6 | Psychology Lab, Research Library, daily activities | M–L | Planned |
| 7 | Conversational AI Mentor (Stockfish stays the only source of evaluations) | M–L | Planned — needs a provider |
| 8 | Social features (only after a security and architecture review) | XL | Planned |
| 9 | Production readiness: E2E tests, accessibility, performance, hosting, monitoring | M | Planned |

## Phase 2 order (proposed)
1. Tactics gaps — zwischenzug and defensive tactics via engine-certified "best move" and "survive" positions.
2. Calculation — quiet moves, defensive calculation, evaluating final positions; blindfold exercises.
3. Endgames — triangulation and pawn races (needs a K+P vs K+P checker or engine certificates), minor-piece, queen endings.
4. Strategy and Grandmaster's Mind — positions from real games, hand-picked, each claim engine-checked.
5. Openings — built on the Lichess opening names database (CC0) plus sourced model games.
6. Tournament Arena and psychology — scenario lessons.
7. Championship Realm — final examination and report (last, since it draws on everything else).

## Decisions needed
- Hosting target (persistent disk) — before Phase 9.
- Sources for master games and opening theory — before Phase 2 step 5.
- AI provider — before Phase 7.

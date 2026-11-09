# Testing report

_Run on 2026-11-08 (end of Phase 1), Windows 11, Node 24.21.0._

## How to run
```
npm test            # PGN check + curriculum verification + all server tests
npm run test:server # server tests only
npm run validate    # curriculum verification with per-position detail
npm run verify:engine -- --audit   # slow: Stockfish certificates + second opinion on every puzzle
```

## Results
| Suite | Result |
|---|---|
| `scripts/check-pgn.ts` (blackmood.pgn) | 13 games, 0 parse issues |
| `scripts/validate-content.ts` | 22 lessons, 201 tasks, 3 master games — all verified |
| Server tests (`server/test/*.test.ts`) | **34 / 34 passed** |
| TypeScript (browser + server) | 0 errors |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Stockfish audit of mate/material puzzles (Phase "engine verifier") | 1 flagged, fixed |

## What the server tests cover
| File | Covers |
|---|---|
| `api.test.ts` | guest/redacted content; XP rules; misses & hints; alternative mates; exam retry rule, retention credit, mastery, highest-credit record; walking away = miss; anti-fabrication; play-out verification incl. forged games; guardian unlocks; engine-certified puzzles; registration/upgrade/login/logout; **account management**; CSRF; game legality; guess scoring |
| `data.test.ts` | **migration of a version-0 database without data loss + pre-migration backup**; persistence across restart; backups include WAL data; pruning; housekeeping never deletes users |
| `lab.test.ts` | Opening Laboratory storage per player; stale-write refusal; upload validation; merge never overwrites and is idempotent |
| `rules.test.ts` | castling (incl. through check, after moving), en passant expiry, all promotions, checkmate vs stalemate, **strict FEN validation**, PGN round trip & variations, referee on promotion/en passant, spaced-repetition scheduling |
| `serving.test.ts` | gzip, immutable caching, app-route fallback, real 404s, no path traversal, CSP; **Kingdom Cup scoring** |
| `engine.test.ts` | Stockfish (Node, NNUE) starts, finds mate, evaluates every move; illegal positions refused |

## Checked by hand in the running app (in-app browser)
- Opening Laboratory loads from the server; old browser data merged once, browser copy kept, no false conflict (after fixing a double-load bug).
- Profile: account security panel (devices, delete flow); Settings: About & licences.
- Production layout (production dependencies only) on port 8899: health, about, gzip, CSP, Stockfish WASM served, photo not served.

## Defects found by testing in Phase 1 (all fixed)
1. **Four curriculum positions were illegal** (Black already in check with White to move): `f-check.i2`, `f-check.e1`, `f-mates.g2`, `f-mates.a1`. chess.js accepts such FENs; a strict check now rejects them everywhere.
2. Stockfish crashes on an illegal position (adjacent kings) — illegal FENs are now refused before reaching it.
3. Opening Laboratory loaded twice in development and showed a false "changed on another device" warning.
4. The browser-data merge was not idempotent (could add duplicate copies).
5. Missing static files were answered with the app page (status 200) instead of 404.
6. "Best session %" was never recorded.

## Not yet tested
- End-to-end browser tests (Playwright) and automated mobile/tablet layout tests — Phase 9.
- Docker build and a Linux run (no Docker/WSL on this machine).
- Load/concurrency tests.

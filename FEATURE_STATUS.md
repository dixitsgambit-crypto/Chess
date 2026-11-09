# Feature status

_Last updated: 2026-11-08 (end of Phase 1). Statuses: **Working** · **Partially working** · **In development** · **Planned** · **Blocked**._
"Working" means covered by automated tests and/or checked in the running app — see TESTING_REPORT.md.

## Accounts & security
| Feature | Status | Notes |
|---|---|---|
| Guest play with server-side progress | Working | |
| Register (guest upgrade keeps progress), sign in, sign out | Working | |
| Change password (signs out other devices) | Working | Phase 1 |
| Sign out all other devices | Working | Phase 1 |
| Delete account (password + typed DELETE) | Working | Phase 1 |
| Password reset by e-mail | Blocked | No e-mail service configured |
| Rate limiting, CSRF/Origin check, strict CSP | Working | Limits are in memory (reset on restart) |

## Learning
| Feature | Status | Notes |
|---|---|---|
| 22 lessons, 8-stage lesson player | Working | See CURRICULUM_MAP.md |
| Server-refereed exercises (answers never sent to the browser) | Working | Heavy checks run in worker threads (Phase 1) |
| XP, mastery, 20-hour exam retry rule, spaced revision | Working | |
| Guardians (4), unlocks, placement | Working | |
| Highest exam credit on the lesson report | Working | Fixed in Phase 1 (was never recorded) |
| Kingdoms 3, 4, 7, 8, 9, 10 lessons | Planned | Phase 2 |
| Zwischenzug, defensive tactics, more endgames | Planned | Phase 2 |

## Training & play
| Feature | Status | Notes |
|---|---|---|
| Revision queue, theme drills, Puzzle Rush | Working | Rush score is self-reported (no XP) |
| Analysis board (FEN/PGN import-export, variations, Stockfish, move review, facts) | Working | Imports now use the strict FEN check (Phase 1) |
| Play the Grandmaster (skill 0–20, clocks) | Working | Off-board results (resign/time/draw) can't be verified |
| Kingdom Cup (3 rounds) | Working | Not Swiss — Phase 5 |
| Master Games + Guess the Move (3 games) | Working | More games: Phase 5 |
| Endgame K+P trainer | Working | |

## Opening Laboratory
| Feature | Status | Notes |
|---|---|---|
| Built-in repertoire (`blackmood.pgn`), lesson playback, practice, explorer, quizzes, notes | Working | |
| Uploaded PGNs, notes and practice stats stored per player on the server | Working | Phase 1 (was browser-only) |
| One-time merge of old browser data, never overwriting | Working | Tested in the app and in `lab.test.ts` |
| Same-named upload kept alongside instead of replacing | Working | Phase 1 |
| Multiple repertoires, flashcards, play vs repertoire | Planned | Phase 4 |

## Operations
| Feature | Status | Notes |
|---|---|---|
| Versioned migrations with pre-migration backup | Working | |
| Daily + manual backups (`npm run backup`) | Working | |
| Hourly housekeeping (never deletes users/progress) | Working | |
| Structured logging (JSON lines) | Working | |
| gzip for static files and large API responses | Working | |
| About & licences panel, GPL-3.0 LICENSE, third-party notices | Working | Set `SOURCE_URL` before public hosting |
| Dockerfile | Partially working | Written; production layout tested on Windows; **not built/run on Linux** |
| Public hosting | Blocked | Needs a host decision (persistent disk) |

## Not started
Personal Grandmaster, Chess Strength Profile, Calculation Arena, Defence Kingdom, Opening War Room,
Swiss simulator, Psychology Lab, Research Library, daily activities beyond missions, AI Mentor, social features.

# Changelog

## Phase 1 — Stabilise and secure (2026-11-08)

### Added
- Versioned database migrations (`PRAGMA user_version`) with an automatic `VACUUM INTO` backup before upgrading; migration v1 adds `lab_data`, indexes and `users.last_seen`.
- Daily automatic backups (14 kept), `npm run backup`, documented restore procedure.
- Hourly housekeeping (expired sessions, stale attempts) — never deletes users or progress.
- Account management: change password (signs out other devices), sign out other devices, delete account.
- Opening Laboratory data (uploads, notes, practice stats, side) stored per player on the server, with a one-time, merge-only import of old browser data and stale-write protection.
- Referee worker threads for move judging and play-out verification.
- Structured JSON logging; gzip for static files and large API responses.
- Strict FEN validation (`src/chess/fen.ts`) for imports, content and the Node engine.
- GPL-3.0-or-later `LICENSE`, `THIRD_PARTY_NOTICES.md`, in-app *About & licences*, `/api/about` with `SOURCE_URL`.
- `Dockerfile` and `.dockerignore` (untested on Linux).
- Tests: database, laboratory, chess rules/FEN/PGN, spaced repetition, serving, tournament scoring, Stockfish (34 server tests in total).
- Project documents: architecture, curriculum map, database schema, feature status, roadmap, testing report, security review, known limitations, this changelog.

### Fixed
- Four illegal curriculum positions (Black already in check): `f-check.i2`, `f-check.e1`, `f-mates.g2`, `f-mates.a1` — corrected, IDs kept.
- Re-uploading a PGN with an existing name silently replaced the repertoire; it is now kept alongside.
- "Highest exam credit" was never recorded on lesson reports.
- Missing static files returned the app page with status 200; now 404.
- Opening Laboratory double-load in development caused a false conflict warning.

### Changed
- Teacher reference photo removed from the public build (moved to `private/`, git-ignored).
- `npm run test:server` runs all server test files.

## Earlier milestones
- **Engine verifier:** Stockfish 16 NNUE in Node; engine certificates; rook-endings lesson; content audit.
- **More curriculum:** 6 lessons (tactics, calculation, distant opposition), position miner.
- **Backend + server XP:** Node + SQLite server, accounts, refereed attempts, redacted content.
- **Frontend slice:** design system, 13 sections, lesson engine, first 15 lessons.

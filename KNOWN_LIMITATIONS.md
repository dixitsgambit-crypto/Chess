# Known limitations

_Last updated: 2026-11-08 (end of Phase 1). Honest list — see FEATURE_STATUS.md for statuses._

## Verification
- Engine certificates (rook endings) are Stockfish 16 judgements at depth 20 — strong evidence, not proof.
- Strategic "best plan" positions and opening trees cannot yet be verified to the academy's standard; those kingdoms stay in preparation.
- Off-board game results, Stockfish's own moves in games/play-outs, play-out hints/restarts and Puzzle Rush scores are reported by the browser.

## Data
- Progress from the very first, browser-only version (`localStorage` key `chessverse.v1`) was never carried to the server and cannot be imported, because the server cannot verify it.
- One upgrade of the development database (to schema v1) ran without a pre-migration backup (it happened during a development auto-restart before the backup was wired in). Nothing was lost; all later migrations back up first.
- Old browser data of the Opening Laboratory is merged into the **first** player who opens the Laboratory in that browser.
- Rate-limit counters are in memory and reset when the server restarts.

## Platform
- The Dockerfile has not been built or run on Linux (no Docker/WSL on the development machine). The production layout was tested on Windows.
- The browser's Stockfish uses the classical evaluation (no 40 MB network download), so in-app analysis is weaker than the certification engine.
- The chessboard is not usable with a screen reader or keyboard alone; touch dragging is untested on real phones.
- No e-mail service: no password reset, no account recovery.
- No end-to-end browser test suite yet.

## Product
- Titles, levels and tournament results are fictional and are not FIDE titles or ratings.
- There is no conversational AI mentor yet; the AI Grandmaster is engine-based.
- Kingdom Cup is a fixed 3-round event, not a Swiss tournament.

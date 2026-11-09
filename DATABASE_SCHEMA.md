# Database schema

SQLite file `data/chessverse.db` (override with `CHESSVERSE_DB`), WAL mode, foreign keys on.
Schema version is tracked with `PRAGMA user_version`. **Current version: 1.**

## Tables

### users
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| username | TEXT UNIQUE COLLATE NOCASE | NULL for guests |
| pass_hash | TEXT | `scrypt$N$r$p$salt$hash`; NULL for guests |
| created_at | INTEGER | ms since epoch |
| guest | INTEGER | 1 guest, 0 registered |
| last_seen | INTEGER | v1; updated at most every 10 minutes |

### sessions
| token_hash TEXT PK (SHA-256 of the cookie token) | user_id → users ON DELETE CASCADE | expires_at INTEGER |

### progress
| user_id PK → users ON DELETE CASCADE | state TEXT (JSON, see `State` in `src/academy/progression.ts`) | updated_at INTEGER |

The JSON holds XP, item records (attempts, credit, review schedule), lesson mastery, guardians, unlocks,
placement, achievements, missions, games (last 200), tournament, settings and profile.

### attempts
| id TEXT PK | user_id → users CASCADE | task_id TEXT | data TEXT (JSON referee session) | created_at INTEGER | done INTEGER |

Indexes: `attempts_user (user_id, done)`, `attempts_created (created_at)` (v1).

### lab_data (v1)
| user_id PK → users CASCADE | data TEXT (JSON: uploaded PGNs, notes, practice stats, side) | updated_at INTEGER |

Writes carry the `updated_at` they were based on; a write based on an older copy is refused (409).

### Indexes
`sessions_user (user_id)` (v1).

## Migrations (`server/migrations.ts`)

- Additive only: create tables/indexes, add columns. Never drop or rewrite data.
- Before any pending migration on a file database, a full backup is written with `VACUUM INTO`
  (`data/backups/pre-migration-vX-to-vY-<time>.db`).
- Each migration runs in a transaction together with its `user_version` bump.
- Tested against a version-0 fixture (`server/test/data.test.ts`).

| Version | Change |
|---|---|
| 0 | Original schema (users, sessions, progress, attempts) |
| 1 | `lab_data`; indexes `attempts_created`, `sessions_user`; `users.last_seen` |

> Note: on the development database, v1 was applied by an automatic dev-server restart before the
> pre-migration backup was wired in, so no pre-migration copy exists for that one upgrade. Row counts
> were checked before and after: nothing was lost.

## Backups (`server/backup.ts`)

- Automatic: one at start-up and one every 24 h → `data/backups/daily-*.db`, newest 14 kept
  (`CHESSVERSE_KEEP_BACKUPS`). Pre-migration backups are never pruned.
- Manual: `npm run backup` → `data/backups/manual-*.db` (safe while the server runs).
- Restore: stop the server, copy a backup over `data/chessverse.db`, delete `chessverse.db-wal` and
  `chessverse.db-shm`, start the server.

## Housekeeping (hourly)

Removes expired sessions, closes attempts left open for more than a day, deletes finished attempts older
than 30 days. **Never deletes users (guest or registered) or progress.**

## Content IDs

Task IDs (e.g. `f-check.e1`) are permanent keys into players' progress. Never rename an ID; if a position
must change, keep the ID (as done for the four corrected positions in Phase 1) or add a new one.

# Security review

_Last updated: 2026-11-08 (end of Phase 1)._

## Controls in place
| Area | Control |
|---|---|
| Passwords | scrypt (N=16384, r=8, p=1, 16-byte salt), timing-safe compare, dummy hash for unknown users |
| Sessions | 32-byte random tokens, stored only as SHA-256; HttpOnly, SameSite=Lax cookies (`Secure` with `COOKIE_SECURE=1`); 30-day expiry; rotated on login/registration; password change signs out other devices |
| CSRF | Writes must be JSON (forces a CORS preflight cross-site) and, when an Origin header is present, it must match the host |
| Rate limits | Auth 20/min per IP and per username; API 900/min per session/IP; password-change and deletion limited per user |
| Input | 64 KB request limit (2.5 MB for laboratory uploads); every field validated; PGN uploads must parse; strict FEN validation on imports |
| Answers | Never sent to the browser (redacted content; reveal only at the end of an attempt); built bundle checked for leaks |
| XP integrity | Awarded only by `server/rules.ts` from server-refereed events, using the server clock; no import of progress |
| Headers | CSP (`default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`), X-Frame-Options DENY, nosniff, Referrer-Policy; HSTS with `COOKIE_SECURE=1` |
| Static files | Path-traversal check; real 404s; long caching only for hashed assets |
| Logs | Method, path, status, duration only — never bodies, cookies, tokens or answers |
| Personal data | Teacher reference photo removed from the public build (`private/`, git-ignored) |

## Known risks (accepted or open)
| Risk | Severity | Status |
|---|---|---|
| Unverifiable client reports: off-board game results, Stockfish's moves in games and Stockfish play-outs, play-out hints/restarts, Puzzle Rush score | Medium | Open — they give no direct XP but can unlock missions/achievements |
| Rate limits held in memory (reset on restart; per-process) | Low | Open |
| `TRUST_PROXY=1` without a real proxy would let clients spoof their IP for rate limiting | Low | Documented — only set behind a proxy |
| `style-src 'unsafe-inline'` (required by chessground) | Low | Accepted |
| Unlimited guest accounts over time (20/min per IP) | Low | Open — guests are never deleted by policy |
| No password reset by e-mail | — | Blocked (no e-mail service) |
| No breached-password check | Low | Planned |
| ngrok exposure of a personal PC | Medium | Operational advice in README |

## Licensing (decided in Phase 1)
Project licence **GPL-3.0-or-later** (chessground and Stockfish are GPL). `LICENSE`, `THIRD_PARTY_NOTICES.md`
and an in-app *About & licences* panel are in place. **Before public hosting, publish the source and set
`SOURCE_URL`.**

# Third-party notices

Chessverse Academy is free software, licensed under the **GNU General Public License,
version 3 or (at your option) any later version** (see `LICENSE`). It is distributed with,
or loads, the components below. When the site is offered to the public, its complete
corresponding source code must be made available to its users (for example by publishing
the repository and setting `SOURCE_URL`, which the in-app *About & licences* panel shows).

| Component | Version | Licence | Used for | Source |
|---|---|---|---|---|
| Stockfish (stockfish.js build) | 16 | GPL-3.0 | Engine analysis, play, content certification | https://github.com/official-stockfish/Stockfish · https://github.com/nmrugg/stockfish.js |
| Stockfish NNUE network `nn-5af11540bbfe.nnue` | 16 | GPL-3.0 (distributed with Stockfish) | Certification only (Node, authoring time); not served to browsers | as above |
| chessground | 9.1.1 | GPL-3.0-or-later | The interactive chessboard | https://github.com/lichess-org/chessground |
| chess.js | 1.0.0 | BSD-2-Clause | Chess rules, move validation, PGN/FEN | https://github.com/jhlywa/chess.js |
| React, React DOM | 18.3.1 | MIT | User interface | https://github.com/facebook/react |
| Vite, @vitejs/plugin-react | 5.4.2 / 4.3.1 | MIT | Build tooling (not shipped) | https://github.com/vitejs/vite |
| TypeScript | 5.5.4 | Apache-2.0 | Build tooling (not shipped) | https://github.com/microsoft/TypeScript |
| Cinzel, Inter (Google Fonts) | — | SIL Open Font License 1.1 | Typography (loaded from Google Fonts) | https://fonts.google.com |
| chessground "cburnett" piece set | — | GPL-2.0-or-later (Colin M.L. Burnett), as bundled with chessground | Piece images | https://github.com/lichess-org/lila (piece set credits) |

## Content

- Lesson positions, explanations and exercises are original to Chessverse Academy and are
  verified with the academy's own tools (`scripts/validate-content.ts`, `scripts/verify-engine.ts`).
- Historical game scores (Morphy 1858, Anderssen 1851/1852) are public-domain records of
  moves; the short context notes are limited to documented facts.
- `public/repertoire/blackmood.pgn` was supplied by the project owner.
- The teacher reference photo is **not** distributed; it is kept in `private/` (git-ignored).

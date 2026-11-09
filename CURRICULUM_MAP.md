# Curriculum map

_Generated from `src/content/` on 2026-11-08. 22 lessons, 201 exercises, 4 guardians, 10 placement positions._

Verification key: **mate** = exhaustive mate search · **material** = material search with uniqueness check ·
**kpk** = exact king-and-pawn solver · **engine** = Stockfish 16 NNUE certificate (depth 20) ·
**rule** = rules exercise · **choice / square** = questions · **playout** = play to the end vs Stockfish or the K+P solver.

## 1. Foundation Realm — complete for its listed topics
| Lesson | Title | Topics | Exercises | Verified by |
|---|---|---|---|---|
| `f-coordinates` | The Board and Its Coordinates | Board coordinates, Chess notation | 10 | square, choice |
| `f-pieces` | How the Pieces Move and Capture | Piece movements, Legal moves, Captures | 10 | material, choice |
| `f-check` | Check, Checkmate and Stalemate | Check, Checkmate, Stalemate | 8 | mate, choice |
| `f-special` | Castling, En Passant and Promotion | Castling, En passant, Promotion | 9 | square, rule, choice |
| `f-material` | Material Value | Material value | 7 | choice, material |
| `f-basic-mates` | Basic Checkmates | Basic checkmates | 8 | mate, playout |
| `f-principles` | Opening Principles | Chess principles | 7 | choice |
| `f-notation` | Notation and PGN | Chess notation, Introduction to PGN | 8 | choice, rule |
| guardian | The Gatekeeper | — | 6 | square, mate, material, choice |

Missing from the Phase 2 plan: *basic tactical awareness*.

## 2. Tactical Kingdom
| Lesson | Title | Topics | Exercises | Verified by |
|---|---|---|---|---|
| `t-forks` | Forks | Forks, Knight forks, Hanging pieces | 7 | material |
| `t-pins` | Pins | Pins | 7 | material, choice |
| `t-skewers` | Skewers | Skewers, X-ray attacks | 6 | material, choice |
| `t-discovered` | Discovered Attacks and Double Check | Discovered attacks/checks, Double checks | 6 | mate, material, choice |
| `t-mating-patterns` | Mating Patterns | Mating patterns (back rank, smothered), Deflection, Decoy | 7 | mate, choice |
| `t-decoy` | Deflection, Decoy and Attraction | Deflection, Decoy, Attraction | 8 | mate, choice |
| `t-defender` | Removing the Defender | Removing the defender, Hanging pieces | 7 | mate, choice |
| `t-lines` | Clearance, X-ray and Interference | Clearance, X-ray attacks, Interference | 7 | mate, choice |
| guardian | The Knight-Captain | — | 5 | material, mate |

**Missing:** Zwischenzug, Defensive tactics, Tactical combinations.

## 3. Strategic Empire — not started
All 24 listed topics (pawn structures, outposts, bishops, prophylaxis, …).

## 4. Opening Empire — not started (the PGN repertoire studio exists in the Opening Laboratory)
All topics and all structured courses (Italian, Ruy Lopez, Queen's Gambit, English, London; Caro-Kann,
French, Sicilian, 1…e5; QGD, KID, Nimzo-Indian, Slav, Dutch).

## 5. Calculation Temple
| Lesson | Title | Topics | Exercises | Verified by |
|---|---|---|---|---|
| `c-forcing` | Checks, Captures and Threats | Forcing moves, Checks/captures/threats, Candidate moves | 8 | mate, choice |
| `c-candidates` | Candidate Moves and the Tree of Variations | Candidate moves, Variation calculation, Tree, Visualisation | 8 | mate, choice |
| guardian | The Oracle | — | 5 | mate |

**Missing:** Position evaluation, Quiet moves, Defensive calculation, Sacrifice calculation, Calculation accuracy,
Time management, Practical decisions, blindfold exercises.

## 6. Endgame Citadel
| Lesson | Title | Topics | Exercises | Verified by |
|---|---|---|---|---|
| `e-opposition` | King Activity and the Opposition | King activity, K+P endings, Opposition | 9 | kpk, choice, playout |
| `e-key-squares` | Key Squares and the Rule of the Square | Key squares, Passed pawns, K+P endings | 8 | kpk, playout, choice |
| `e-distant-opposition` | Distant Opposition | Distant opposition, K+P endings, King activity | 8 | kpk, choice, playout |
| `e-rook-endings` | Rook Endings: Lucena and Philidor | Rook endings, Lucena, Philidor, Rook activity, Theoretical draws | 8 | engine, choice; demo engine-certified |
| guardian | The Citadel Warden | — | 4 | kpk, choice |

**Missing:** Triangulation, Pawn breakthroughs/races, Outside passed pawn, Bishop, Knight, Bishop-vs-Knight,
same/opposite-coloured bishop, Queen endings, Practical technique, Drawing techniques.

## 7–10 — not started
Tournament Arena, Grandmaster's Mind, Masters' Library (3 historical games exist in Master Games), Championship Realm.

## Placement
10 unseen positions across Foundation (5), Tactics (4) and Endgames (1); taken once; tests out lessons.

## Content quality rules
- Every position must pass `npm test` (legal FEN under the strict check, verified goal, unique answer).
- Assessment positions (exam, guardian, placement) must not appear anywhere else.
- Engine positions need a current certificate (`npm run verify:engine`).
- Explanations may only claim what the verifier shows (checked by printing every defence).

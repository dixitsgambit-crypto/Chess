// Parses the bundled repertoire and prints a structural report. Run: npm test
import { readFileSync } from 'node:fs';
import { parsePgn, walk } from '../src/pgn/parser.ts';
import { buildRepertoire } from '../src/repertoire/build.ts';

const file = process.argv[2] ?? 'public/repertoire/blackmood.pgn';
const games = parsePgn(readFileSync(file, 'utf8'));
let failures = 0;
for (const g of games) {
  const nodes = [...walk(g.root)].length - 1;
  const comments = [...walk(g.root)].reduce((s, n) => s + n.commentsBefore.length + n.commentsAfter.length, 0);
  console.log(`#${g.index} ${g.headers.White ?? '?'} — ${nodes} moves, ${comments} comments, ${g.issues.length} issues`);
  for (const i of g.issues) {
    failures++;
    console.log(`   ! ${i.message} after "${i.context}" skipped: ${i.skippedText}`);
  }
}
const rep = buildRepertoire(games);
console.log(`\nSide: ${rep.side}`);
for (const c of rep.courses) {
  console.log(`Course ${c.title}: ${c.chapters.length} chapters, ${c.chapters.reduce((s, ch) => s + ch.lines.length, 0)} lines`);
}
console.log(`Transpositions: ${rep.transpositions.length}`);
for (const t of rep.transpositions.slice(0, 8)) console.log('  ', t.lines.join('  ==  '));
console.log(`Critical positions: ${rep.critical.length}`);
console.log(`Open questions needing your answer: ${rep.critical.filter((c) => c.kinds.includes('question')).length}`);
if (failures) {
  console.error(`\n${failures} parse issue(s)`);
  process.exit(1);
}

import type { Line, Repertoire } from '../repertoire/build';
import type { ParseIssue } from '../pgn/types';
import { loadStats } from './Practice';

export function Library({
  rep,
  sources,
  onLesson,
  onPractice,
  onExplore,
  onUpload,
  onRemoveSource,
}: {
  rep: Repertoire;
  sources: { name: string; builtIn: boolean }[];
  onLesson: (l: Line) => void;
  onPractice: (l: Line) => void;
  onExplore: (chapterId: string) => void;
  onUpload: (files: FileList) => void;
  onRemoveSource: (name: string) => void;
}) {
  const stats = loadStats();
  const issues: ParseIssue[] = rep.games.flatMap((g) => g.issues);
  const totalLines = rep.chapters.reduce((s, c) => s + c.lines.length, 0);
  const questions = rep.critical.filter((c) => c.kinds.includes('question')).length;

  return (
    <div className="library">
      <section className="hero panel">
        <div>
          <h2>Your repertoire</h2>
          <p className="muted">
            {rep.chapters.length} chapters · {totalLines} lines · {rep.critical.length} critical positions · {rep.transpositions.length} transpositions ·{' '}
            {questions} questions from your file · playing {rep.side === 'w' ? 'White' : 'Black'}
          </p>
          <div className="sources">
            {sources.map((s) => (
              <span key={s.name} className="chip">
                {s.name}
                {!s.builtIn && <button className="link" onClick={() => onRemoveSource(s.name)} title="Remove">×</button>}
              </span>
            ))}
            <label className="button primary">
              Upload PGN
              <input type="file" accept=".pgn,text/plain" multiple hidden onChange={(e) => e.target.files && onUpload(e.target.files)} />
            </label>
          </div>
        </div>
        {issues.length > 0 ? (
          <div className="issues">
            <strong className="err">{issues.length} part(s) of your file could not be read</strong>
            <ul>
              {issues.map((i, k) => (
                <li key={k} className="small">Chapter {i.gameIndex + 1}: {i.message}{i.context && ` after ${i.context}`}{i.skippedText && ` — kept text: ${i.skippedText}`}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="ok small">Every move in your file was validated as legal. All comments, arrows and variations are preserved.</p>
        )}
      </section>

      {rep.courses.map((course) => (
        <section key={course.id} className="course">
          <h3>{course.title}</h3>
          <div className="chapter-grid">
            {course.chapters.map((ch) => (
              <div key={ch.id} className="chapter panel">
                <div className="panel-head">
                  <strong>{ch.title}</strong>
                  <span className="muted small">{ch.eco}</span>
                  <button onClick={() => onExplore(ch.id)}>Explore</button>
                </div>
                <ul className="lines">
                  {ch.lines.map((l) => {
                    const s = stats[l.id];
                    return (
                      <li key={l.id}>
                        <span className="line-label">{l.isMain ? '★ Main line' : l.label}</span>
                        <span className="muted small">{l.nodes.length} ply</span>
                        {s && <span className={`chip small ${s.clean ? 'chip-ok' : ''}`} title="practice: clean runs / attempts">{s.clean}/{s.attempts}</span>}
                        <button onClick={() => onLesson(l)}>▶ Lesson</button>
                        <button onClick={() => onPractice(l)}>Practice</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      {rep.transpositions.length > 0 && (
        <section className="panel">
          <div className="panel-head"><strong>Transpositions found in your material</strong></div>
          <ul className="small">
            {rep.transpositions.map((t) => (
              <li key={t.key}>{t.lines.join('  ⇄  ')}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

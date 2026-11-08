import { useMemo, useState } from 'react';
import { Board } from './Board';
import type { Quiz } from '../lessons/generate';
import { formatLine, pathTo } from '../pgn/parser';

const KIND_LABEL: Record<Quiz['kind'], string> = {
  question: 'Question from your file',
  'find-move': 'Find the key move',
  'avoid-mistake': 'Why is this a mistake?',
  punish: 'Punish the mistake',
};

function QuizCard({ quiz, side, onAnswer }: { quiz: Quiz; side: 'w' | 'b'; onAnswer: (q: Quiz) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [tried, setTried] = useState<string | null>(null);
  const interactive = quiz.kind === 'find-move' || quiz.kind === 'punish';
  const target = quiz.answerMoves[0];
  const correct = tried && target && tried.slice(0, 4) === target.uci.slice(0, 4);
  const anns = [...quiz.node.commentsBefore, ...quiz.node.commentsAfter];
  return (
    <div className="quiz-card">
      <div className="quiz-board">
        <Board
          key={tried ?? 'fresh'}
          fen={quiz.node.fen}
          orientation={side === 'w' ? 'white' : 'black'}
          lastMove={quiz.node.uci ? [quiz.node.uci.slice(0, 2), quiz.node.uci.slice(2, 4)] : undefined}
          arrows={revealed ? anns.flatMap((a) => a.arrows) : []}
          squares={revealed ? anns.flatMap((a) => a.squares) : []}
          movable={interactive && !revealed ? (side === 'w' ? 'white' : 'black') : null}
          onMove={(u) => setTried(u)}
        />
      </div>
      <div className="quiz-body">
        <span className="tag">{KIND_LABEL[quiz.kind]}</span>
        <p className="muted small">{quiz.chapter.title} · {formatLine(pathTo(quiz.node)) || 'start'}</p>
        <p className="quiz-prompt">{quiz.prompt}</p>
        {interactive && tried && !revealed && (
          <p className={correct ? 'ok' : 'err'}>{correct ? 'Correct — that is the move in your file.' : 'Not the move in your file. Try again or reveal.'}</p>
        )}
        {!revealed ? (
          <button className="primary" onClick={() => setRevealed(true)}>Reveal answer</button>
        ) : (
          <div className="answer">
            {quiz.answerMoves.length > 0 && (
              <p><span className="badge">From your PGN</span> {formatLine(quiz.answerMoves)}</p>
            )}
            {quiz.answerMoves.flatMap((m) => m.commentsAfter).filter((c) => c.text).slice(0, 2).map((c, i) => (
              <p key={i}><span className="badge">From your PGN</span> {c.text}</p>
            ))}
            {quiz.answerNote ? (
              <p className="src-notes"><span className="badge notes-badge">Your notes</span> {quiz.answerNote}</p>
            ) : (
              <p className="src-missing">
                <span className="badge">Needs your input</span> No written explanation yet.{' '}
                <a onClick={() => onAnswer(quiz)}>Write the answer</a>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Quizzes({ quizzes, side, onAnswer }: { quizzes: Quiz[]; side: 'w' | 'b'; onAnswer: (q: Quiz) => void }) {
  const [kind, setKind] = useState<'all' | Quiz['kind']>('all');
  const [course, setCourse] = useState('all');
  const chapters = useMemo(() => [...new Set(quizzes.map((q) => q.chapter.title))], [quizzes]);
  const shown = quizzes.filter((q) => (kind === 'all' || q.kind === kind) && (course === 'all' || q.chapter.title === course));
  return (
    <div>
      <div className="row filters">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="all">All exercise types ({quizzes.length})</option>
          {(Object.keys(KIND_LABEL) as Quiz['kind'][]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]} ({quizzes.filter((q) => q.kind === k).length})</option>
          ))}
        </select>
        <select value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="all">All chapters</option>
          {chapters.map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="muted small">Every exercise is built from your own file: your questions, your ! moves and your ? marks.</span>
      </div>
      <div className="quiz-grid">
        {shown.map((q) => <QuizCard key={q.id} quiz={q} side={side} onAnswer={onAnswer} />)}
      </div>
    </div>
  );
}

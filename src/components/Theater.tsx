import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board';
import { Teacher } from './Teacher';
import { LineVerifier } from './EnginePanel';
import type { LessonScript, Utterance } from '../lessons/generate';
import { formatLine } from '../pgn/parser';

export const SOURCE_LABEL: Record<Utterance['source'], string> = {
  pgn: 'From your PGN',
  notes: 'Your notes',
  auto: 'Move description',
  missing: 'Needs your input',
};

const speakable = (u: Utterance) => u.source !== 'missing';
const forSpeech = (t: string) => t.replace(/https?:\/\/\S+/g, '').replace(/\s—\s/g, '. ').replace(/\.\.\./g, ' ');

export function Theater({ script, side, onPractice }: { script: LessonScript; side: 'w' | 'b'; onPractice: () => void }) {
  const { steps } = script;
  const [stepIdx, setStepIdx] = useState(0);
  const [uttIdx, setUttIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => 'speechSynthesis' in window);
  const [rate, setRate] = useState(1);
  const [talking, setTalking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setStepIdx(0);
    setUttIdx(0);
    setPlaying(false);
  }, [script]);

  const step = steps[stepIdx];
  const utt = step.speech[uttIdx];

  const advance = () => {
    if (uttIdx + 1 < step.speech.length) setUttIdx(uttIdx + 1);
    else if (stepIdx + 1 < steps.length) {
      setStepIdx(stepIdx + 1);
      setUttIdx(0);
    } else setPlaying(false);
  };

  // Playback: speak (or time) the current utterance, then move on.
  useEffect(() => {
    clearTimeout(timer.current);
    if (!playing || !utt) {
      setTalking(false);
      return;
    }
    let cancelled = false;
    const next = () => !cancelled && advance();
    if (!speakable(utt)) {
      setTalking(false);
      timer.current = setTimeout(next, 2200 / rate);
    } else if (voiceOn && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(forSpeech(utt.text));
      u.rate = rate;
      u.onstart = () => !cancelled && setTalking(true);
      u.onend = () => {
        if (cancelled) return;
        setTalking(false);
        timer.current = setTimeout(next, 450 / rate);
      };
      u.onerror = () => {
        if (cancelled) return;
        setTalking(false);
        timer.current = setTimeout(next, 1200);
      };
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } else {
      setTalking(true);
      const ms = Math.max(1600, utt.text.length * 55) / rate;
      timer.current = setTimeout(() => {
        setTalking(false);
        timer.current = setTimeout(next, 350);
      }, ms);
    }
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, [playing, stepIdx, uttIdx, voiceOn, rate]);

  const go = (i: number) => {
    setStepIdx(Math.max(0, Math.min(steps.length - 1, i)));
    setUttIdx(0);
  };

  const progress = useMemo(() => (stepIdx / Math.max(1, steps.length - 1)) * 100, [stepIdx, steps.length]);

  return (
    <div className="theater">
      <div className="stage">
        <div className="stage-title">
          <span>{script.chapter.title}</span>
          <span className="muted">{script.line.isMain ? 'Main line' : script.line.label}</span>
        </div>
        <div className="stage-body">
          <div className="stage-teacher">
            <Teacher expression={step.expression} talking={talking} size={300} />
          </div>
          <div className="stage-board">
            <Board fen={step.fen} orientation={side === 'w' ? 'white' : 'black'} lastMove={step.lastMove} arrows={step.arrows} squares={step.squares} />
          </div>
        </div>
        <div className={`subtitle src-${utt?.source}`}>
          {utt && <span className="badge">{SOURCE_LABEL[utt.source]}</span>}
          <span>{utt?.text}</span>
        </div>
        <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="controls">
        <button onClick={() => go(0)} title="Restart">⏮</button>
        <button onClick={() => go(stepIdx - 1)} title="Previous move">◀</button>
        <button className="primary" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play lesson'}</button>
        <button onClick={() => go(stepIdx + 1)} title="Next move">▶</button>
        <label className="toggle">
          <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} disabled={!('speechSynthesis' in window)} /> Voice
        </label>
        <label>
          Speed{' '}
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
            {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
        </label>
        <button onClick={onPractice}>Practice this line</button>
      </div>

      <div className="theater-side">
        <div className="panel">
          <div className="panel-head"><strong>Script</strong><span className="muted small">click to jump</span></div>
          <ol className="script">
            {steps.map((s, i) => (
              <li key={i} className={i === stepIdx ? 'active' : ''} onClick={() => go(i)}>
                <b>{s.node ? `${s.node.moveNumber}${s.node.color === 'w' ? '.' : '...'}${s.node.san}` : i === 0 ? 'Intro' : 'Summary'}</b>
                {s.speech.filter((u) => u.source !== 'auto').map((u, j) => (
                  <div key={j} className={`script-line src-${u.source}`}><span className="badge">{SOURCE_LABEL[u.source]}</span> {u.text}</div>
                ))}
              </li>
            ))}
          </ol>
        </div>
        <LineVerifier nodes={script.line.nodes} side={side} />
        <p className="muted small">Line: {formatLine(script.line.nodes)}</p>
      </div>
    </div>
  );
}

import { Component, useEffect, type ReactNode } from 'react';
import { useRoute } from './academy/router';
import { boot, useSession } from './academy/store';
import { Shell } from './components/academy/Shell';
import { Home } from './components/academy/Home';
import { AcademyView, BossBattle, KingdomView, Placement } from './components/academy/Academy';
import { KingdomMap } from './components/academy/KingdomMap';
import { LessonPlayer, NotFound } from './components/academy/LessonPlayer';
import { Coach } from './components/academy/Coach';
import { Training } from './components/academy/Training';
import { Achievements, EndgameCitadel, MasterLibrary, OpeningLab, Profile, ProgressView, SettingsView, TournamentHall } from './components/academy/Sections';

function Page({ parts }: { parts: string[] }) {
  const [section, a, b] = parts;
  switch (section) {
    case 'home': return <Home />;
    case 'academy': return <AcademyView />;
    case 'kingdom': return <KingdomView id={a} />;
    case 'lesson': return <LessonPlayer key={a} id={a} stage={b} />;
    case 'boss': return <BossBattle key={a} id={a} />;
    case 'placement': return <Placement />;
    case 'map': return <KingdomMap />;
    case 'coach': return <Coach tab={a} />;
    case 'training': return <Training tab={a} />;
    case 'openings': return <OpeningLab />;
    case 'endgames': return <EndgameCitadel />;
    case 'library': return <MasterLibrary key={a} id={a} />;
    case 'tournament': return <TournamentHall />;
    case 'progress': return <ProgressView />;
    case 'achievements': return <Achievements />;
    case 'profile': return <Profile />;
    case 'settings': return <SettingsView />;
    default: return <NotFound />;
  }
}

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidUpdate(prev: { resetKey: string }) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (this.state.error) return (
      <div className="empty">
        <h2>Something went wrong on this page</h2>
        <p className="muted">{this.state.error.message}</p>
        <button className="btn primary" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const parts = useRoute();
  const session = useSession();
  useEffect(() => { void boot(); }, []);
  if (session.status !== 'ready') return (
    <div className="boot">
      <span className="brand-mark" aria-hidden>♞</span>
      {session.status === 'loading' ? <p className="muted">Opening the gates of the academy…</p> : (
        <>
          <h1>The academy server is unreachable</h1>
          <p className="muted">{session.error}</p>
          <p className="small muted">In development, start everything with <code>npm run dev</code> (it runs the API server and the site together).</p>
          <button className="btn primary" onClick={() => void boot(true)}>Try again</button>
        </>
      )}
    </div>
  );
  return (
    <Shell section={parts[0]}>
      <Boundary resetKey={parts.join('/')}><Page parts={parts} /></Boundary>
    </Shell>
  );
}

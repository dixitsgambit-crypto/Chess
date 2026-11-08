import { useState, type ReactNode } from 'react';
import { href } from '../../academy/router';
import { levelFor, titleFor, useSession, useStore, useToasts, xpForLevel } from '../../academy/store';
import { usePrefersReducedMotion } from '../../academy/motion';

export const NAV: { id: string; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '⌂' },
  { id: 'academy', label: 'Chess Academy', icon: '📖' },
  { id: 'map', label: 'Kingdom Map', icon: '🗺' },
  { id: 'coach', label: 'AI Grandmaster', icon: '♛' },
  { id: 'training', label: 'Training Grounds', icon: '⚔' },
  { id: 'openings', label: 'Opening Laboratory', icon: '⚗' },
  { id: 'endgames', label: 'Endgame Citadel', icon: '♔' },
  { id: 'library', label: 'Master Games', icon: '📜' },
  { id: 'tournament', label: 'Tournament Hall', icon: '🏆' },
  { id: 'progress', label: 'My Progress', icon: '📈' },
  { id: 'achievements', label: 'Achievements', icon: '✦' },
  { id: 'profile', label: 'Player Profile', icon: '☗' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

const SECTION_OF: Record<string, string> = { lesson: 'academy', kingdom: 'academy', boss: 'academy', placement: 'academy' };

export function Shell({ section, children }: { section: string; children: ReactNode }) {
  const s = useStore();
  const session = useSession();
  const [open, setOpen] = useState(false);
  usePrefersReducedMotion();
  const level = levelFor(s.xp);
  const title = titleFor(level);
  const lo = xpForLevel(level), hi = xpForLevel(level + 1);
  const active = SECTION_OF[section] ?? section;

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <a className="skip" href="#main">Skip to content</a>
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href={href('home')} onClick={() => setOpen(false)}>
          <span className="brand-mark" aria-hidden>♞</span>
          <span><span className="brand-name">Chessverse</span><span className="brand-sub">Academy</span></span>
        </a>
        <nav>
          {NAV.map((n) => (
            <a key={n.id} href={href(n.id)} className={`nav-link ${active === n.id ? 'active' : ''}`} aria-current={active === n.id ? 'page' : undefined} onClick={() => setOpen(false)}>
              <span className="nav-icon" aria-hidden>{n.icon}</span>{n.label}
            </a>
          ))}
        </nav>
        <p className="sidebar-foot">The Complete Journey of a Chess Player.</p>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <button className="hamburger" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
          <div className="player-chip">
            <span className="emblem" aria-hidden>{s.profile.emblem}</span>
            <div>
              <div className="player-name">{s.profile.name}</div>
              <div className="player-title">{title.title} · Level {level}</div>
            </div>
          </div>
          {session.user?.guest && <a className="guest-link" href={href('profile')}>Guest · save progress</a>}
          <div className="xpbar" title={`${s.xp - lo} / ${hi - lo} XP to level ${level + 1}`}>
            <span className="xpbar-fill" style={{ width: `${Math.min(100, ((s.xp - lo) / (hi - lo)) * 100)}%` }} />
            <span className="xpbar-text">{s.xp} XP</span>
          </div>
        </header>
        <main id="main" className="content">{children}</main>
      </div>
      <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} />
      <Toasts />
    </div>
  );
}

function Toasts() {
  const toasts = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <div className="page-sub">{children}</div>}
    </header>
  );
}

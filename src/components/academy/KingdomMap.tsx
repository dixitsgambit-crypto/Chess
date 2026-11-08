import { KINGDOMS } from '../../academy/content';
import { useStore } from '../../academy/store';
import { href } from '../../academy/router';
import { PageHead } from './Shell';

const W = 1000, H = 620;
const px = (x: number) => (x / 100) * W;
const py = (y: number) => (y / 100) * H;

function Castle({ x, y, scale = 1, tone }: { x: number; y: number; scale?: number; tone: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={`castle castle-${tone}`}>
      <path d="M-26 0 V-30 h6 v-6 h5 v6 h6 v-6 h5 v6 h6 v-6 h5 v6 h6 V0 Z" />
      <path d="M-34 0 V-44 h4 v-5 h4 v5 h4 V0 Z M22 0 V-44 h4 v-5 h4 v5 h4 V0 Z" />
      <path d="M-6 0 v-12 a6 6 0 0 1 12 0 v12 Z" className="gate" />
      <path d="M-2 -60 v-14 l12 5 l-12 5" className="flag" />
      <path d="M-2 -36 V-60" className="pole" />
    </g>
  );
}

export function KingdomMapArt({ compact = false }: { compact?: boolean }) {
  const s = useStore();
  const pts = KINGDOMS.map((k) => ({ k, x: px(k.map.x), y: py(k.map.y) }));
  const road = pts.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `Q${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 40 : -40)} ${(pts[i - 1].y + p.y) / 2} ${p.x} ${p.y}`)).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`map-svg ${compact ? 'compact' : ''}`} role={compact ? 'presentation' : 'img'} aria-label={compact ? undefined : 'Map of the ten kingdoms'}>
      <defs>
        <radialGradient id="mapGlow" cx="50%" cy="45%" r="70%"><stop offset="0" stopColor="var(--map-hi)" /><stop offset="1" stopColor="var(--map-lo)" /></radialGradient>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="var(--map-line)" strokeWidth="0.6" /></pattern>
        <filter id="soft"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <rect width={W} height={H} fill="url(#mapGlow)" />
      <rect width={W} height={H} fill="url(#grid)" opacity="0.5" />
      {/* mountains */}
      <g className="mountains">
        <path d="M120 230 l60 -90 l40 55 l30 -40 l70 95 Z" />
        <path d="M600 120 l50 -70 l35 45 l40 -60 l70 90 Z" />
        <path d="M780 330 l45 -60 l30 35 l45 -55 l60 80 Z" />
      </g>
      {/* river */}
      <path className="river" d="M0 470 C 180 430, 260 520, 420 480 S 640 380, 760 430 S 930 520, 1000 480" />
      {/* forests */}
      <g className="forest">
        {[[360, 560], [380, 548], [400, 562], [520, 300], [540, 288], [560, 302], [860, 580], [880, 566], [900, 582], [240, 400], [258, 388]].map(([x, y], i) => <path key={i} d={`M${x} ${y} l10 -22 l10 22 Z`} />)}
      </g>
      <path d={road} className="road" />
      <g className="fog"><ellipse cx="300" cy="200" rx="220" ry="60" filter="url(#soft)" /><ellipse cx="760" cy="520" rx="240" ry="50" filter="url(#soft)" /></g>
      {pts.map(({ k, x, y }) => {
        const open = s.unlocked.includes(k.id);
        const done = !!s.bosses[k.id]?.defeated;
        const tone = done ? 'won' : open && k.lessons.length ? 'open' : k.lessons.length ? 'sealed' : 'soon';
        const node = (
          <g className={`map-node node-${tone}`}>
            {!compact && open && !done && k.lessons.length > 0 && <circle cx={x} cy={y - 24} r="54" className="halo" />}
            <Castle x={x} y={y} scale={compact ? 1 : 1.15} tone={tone} />
            {!compact && (
              <>
                <text x={x} y={y + 26} className="map-label">{k.order}. {k.name}</text>
                <text x={x} y={y + 44} className="map-sub">{tone === 'won' ? 'Conquered' : tone === 'open' ? 'Open' : tone === 'sealed' ? 'Sealed — defeat the previous guardian' : 'In preparation'}</text>
              </>
            )}
          </g>
        );
        return compact ? <g key={k.id}>{node}</g> : <a key={k.id} href={href(`kingdom/${k.id}`)} aria-label={`${k.name}: ${tone}`}>{node}</a>;
      })}
    </svg>
  );
}

export function KingdomMap() {
  return (
    <div>
      <PageHead eyebrow="The Realm" title="Kingdom Map">Ten kingdoms, one road. Defeat each guardian to open the gates ahead — every kingdom’s lessons stay open for study.</PageHead>
      <div className="map-frame"><KingdomMapArt /></div>
      <ul className="legend">
        <li><span className="legend-swatch lg-open" /> Open</li>
        <li><span className="legend-swatch lg-won" /> Guardian defeated</li>
        <li><span className="legend-swatch lg-sealed" /> Sealed</li>
        <li><span className="legend-swatch lg-soon" /> Curriculum in preparation</li>
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import type { Expression } from '../lessons/generate';

/**
 * The academy teacher, drawn to match the user's reference image (kept privately in private/teacher/, never served):
 * tight dark curls with faded sides, light-brown skin, stubble + goatee, white stud earring,
 * plain white tee, podcast microphone in front. One rig, eight expressions — the design never changes.
 */

type Brows = 'neutral' | 'raised' | 'furrow' | 'one-up';
type Eyes = 'calm' | 'open' | 'wide' | 'happy' | 'look-up';
type Mouth = 'neutral' | 'smile' | 'laugh' | 'o' | 'flat' | 'talk';
type Arm = 'rest' | 'explain' | 'point' | 'think';

const RIG: Record<Expression, { brows: Brows; eyes: Eyes; mouth: Mouth; arm: Arm }> = {
  neutral: { brows: 'neutral', eyes: 'calm', mouth: 'neutral', arm: 'rest' },
  happy: { brows: 'raised', eyes: 'happy', mouth: 'smile', arm: 'rest' },
  thinking: { brows: 'one-up', eyes: 'look-up', mouth: 'flat', arm: 'think' },
  surprised: { brows: 'raised', eyes: 'wide', mouth: 'o', arm: 'explain' },
  explaining: { brows: 'neutral', eyes: 'open', mouth: 'neutral', arm: 'explain' },
  serious: { brows: 'furrow', eyes: 'calm', mouth: 'flat', arm: 'rest' },
  laughing: { brows: 'raised', eyes: 'happy', mouth: 'laugh', arm: 'rest' },
  pointing: { brows: 'raised', eyes: 'open', mouth: 'smile', arm: 'point' },
};

const C = {
  skin: '#c68b5f',
  skinShade: '#a96f47',
  skinDeep: '#8a5534',
  line: '#4a2e1f',
  hair: '#1d1511',
  curl: '#3b2b22',
  shirt: '#f1f1ef',
  shirtShade: '#d6d6d3',
  lip: '#9c5a45',
  mouth: '#3d1a14',
  stubble: '#6e4b35',
};

// Curl centres along the top of the head (hand-placed to read like the reference's tight curls)
const CURLS: [number, number, number][] = [
  [122, 120, 14], [116, 96, 15], [124, 72, 16], [142, 52, 17], [166, 40, 17], [192, 36, 17], [218, 42, 17],
  [240, 58, 16], [254, 82, 15], [256, 108, 14], [246, 128, 13], [140, 82, 15], [164, 66, 16], [190, 62, 16],
  [216, 68, 16], [234, 88, 15], [154, 102, 14], [180, 92, 15], [206, 96, 15], [228, 110, 13], [134, 118, 12],
  [166, 120, 12], [194, 118, 12], [220, 126, 11],
];

function Brows({ kind }: { kind: Brows }) {
  const left = { neutral: 'M134 170 Q150 162 170 166', raised: 'M134 162 Q150 152 170 158', furrow: 'M136 164 Q152 166 171 173', 'one-up': 'M134 170 Q150 164 170 168' }[kind];
  const right = { neutral: 'M190 166 Q210 162 226 170', raised: 'M190 158 Q210 152 226 162', furrow: 'M189 173 Q208 166 224 164', 'one-up': 'M190 158 Q210 148 226 158' }[kind];
  return (
    <g stroke={C.hair} strokeWidth={8} strokeLinecap="round" fill="none">
      <path d={left} />
      <path d={right} />
    </g>
  );
}

function Eye({ cx, kind, blink }: { cx: number; kind: Eyes; blink: boolean }) {
  const cy = 190;
  if (blink || kind === 'happy') {
    return kind === 'happy' ? (
      <path d={`M${cx - 11} ${cy + 2} Q${cx} ${cy - 8} ${cx + 11} ${cy + 2}`} stroke={C.line} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    ) : (
      <path d={`M${cx - 11} ${cy} Q${cx} ${cy + 5} ${cx + 11} ${cy}`} stroke={C.line} strokeWidth={3} fill="none" strokeLinecap="round" />
    );
  }
  const ry = kind === 'wide' ? 8 : 6;
  const look = kind === 'look-up' ? { dx: 4, dy: -3 } : { dx: 0, dy: 0 };
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={11} ry={ry} fill="#fbf7f2" />
      <circle cx={cx + look.dx} cy={cy + look.dy} r={kind === 'wide' ? 3.6 : 4.4} fill={C.hair} />
      {/* heavy upper lid gives the calm, half-closed look from the reference */}
      {kind === 'calm' && <path d={`M${cx - 12} ${cy - 7} L${cx + 12} ${cy - 7} L${cx + 12} ${cy + 0.5} Q${cx} ${cy - 2} ${cx - 12} ${cy + 0.5} Z`} fill={C.skinShade} />}
      <path d={`M${cx - 12} ${cy + (kind === 'calm' ? 0.5 : -ry + 1)} Q${cx} ${cy - (kind === 'calm' ? 2 : ry + 3)} ${cx + 12} ${cy + (kind === 'calm' ? 0.5 : -ry + 1)}`} stroke={C.line} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    </g>
  );
}

function MouthShape({ kind }: { kind: Mouth }) {
  switch (kind) {
    case 'smile':
      return (
        <g>
          <path d="M160 254 Q180 274 200 254 Q180 262 160 254 Z" fill={C.mouth} />
          <path d="M164 256 Q180 263 196 256 L194 260 Q180 265 166 260 Z" fill="#fff" />
          <path d="M158 253 Q180 278 202 253" stroke={C.lip} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'laugh':
      return (
        <g>
          <path d="M156 250 Q180 252 204 250 Q200 286 180 288 Q160 286 156 250 Z" fill={C.mouth} />
          <path d="M160 252 Q180 254 200 252 L198 259 Q180 261 162 259 Z" fill="#fff" />
          <ellipse cx={180} cy={278} rx={12} ry={6} fill="#c4645a" />
        </g>
      );
    case 'o':
      return <ellipse cx={180} cy={262} rx={8} ry={10} fill={C.mouth} stroke={C.lip} strokeWidth={2.5} />;
    case 'flat':
      return <path d="M164 260 Q180 257 196 261" stroke={C.lip} strokeWidth={4} fill="none" strokeLinecap="round" />;
    case 'talk':
      return (
        <g>
          <path d="M162 254 Q180 250 198 254 Q194 272 180 273 Q166 272 162 254 Z" fill={C.mouth} />
          <path d="M165 255 Q180 252 195 255 L194 259 Q180 257 166 259 Z" fill="#fff" />
          <path d="M162 254 Q180 250 198 254" stroke={C.lip} strokeWidth={2.5} fill="none" />
        </g>
      );
    default:
      // The reference pose: lips slightly parted, top teeth just visible
      return (
        <g>
          <path d="M163 256 Q180 252 197 256 Q190 264 180 264 Q170 264 163 256 Z" fill={C.mouth} />
          <path d="M166 256.5 Q180 254 194 256.5 L193 259 Q180 257.5 167 259 Z" fill="#fff" />
          <path d="M163 256 Q180 252 197 256" stroke={C.lip} strokeWidth={2.4} fill="none" />
          <path d="M168 265 Q180 269 192 265" stroke={C.lip} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

function Arm({ kind }: { kind: Arm }) {
  // Right arm (viewer's right). The left arm stays relaxed at the side.
  switch (kind) {
    case 'explain':
      return (
        <g className="t-arm">
          <path d="M292 352 Q318 330 336 300 L352 312 Q336 348 306 372 Z" fill={C.shirt} stroke={C.shirtShade} strokeWidth={2} />
          <path d="M338 302 Q344 276 340 256 L356 254 Q362 280 352 310 Z" fill={C.skin} />
          {/* open palm */}
          <path d="M336 258 Q334 236 342 230 Q346 238 346 246 Q350 226 356 228 Q358 240 356 250 Q362 236 366 240 Q366 254 358 264 Z" fill={C.skin} stroke={C.skinShade} strokeWidth={1.5} />
        </g>
      );
    case 'point':
      return (
        <g className="t-arm">
          <path d="M290 352 Q320 320 350 304 L360 322 Q330 344 304 372 Z" fill={C.shirt} stroke={C.shirtShade} strokeWidth={2} />
          <path d="M352 306 L394 288 L400 304 L360 322 Z" fill={C.skin} />
          {/* fist with index finger toward the board */}
          <rect x={392} y={282} width={22} height={24} rx={9} fill={C.skin} stroke={C.skinShade} strokeWidth={1.5} />
          <path d="M410 288 L436 284 Q440 288 436 292 L412 296 Z" fill={C.skin} stroke={C.skinShade} strokeWidth={1.5} />
        </g>
      );
    case 'think':
      return (
        <g className="t-arm">
          <path d="M282 360 Q262 330 236 318 L222 336 Q246 352 262 380 Z" fill={C.shirt} stroke={C.shirtShade} strokeWidth={2} />
          <path d="M236 320 Q220 306 206 298 L196 312 Q212 322 226 336 Z" fill={C.skin} />
          {/* knuckles resting under the chin */}
          <ellipse cx={196} cy={300} rx={15} ry={11} fill={C.skin} stroke={C.skinShade} strokeWidth={1.5} />
          <path d="M184 296 Q196 290 208 296" stroke={C.skinShade} strokeWidth={1.5} fill="none" />
        </g>
      );
    default:
      return (
        <g className="t-arm">
          {/* the reference pose: forearm resting forward, hand near the mic */}
          <path d="M292 352 Q322 330 344 332 L350 350 Q326 352 308 376 Z" fill={C.shirt} stroke={C.shirtShade} strokeWidth={2} />
          <path d="M344 334 Q350 352 336 372 L320 366 Q332 352 330 340 Z" fill={C.skin} />
          <path d="M320 366 Q314 378 322 388 Q334 390 340 378 L336 368 Z" fill={C.skin} stroke={C.skinShade} strokeWidth={1.5} />
        </g>
      );
  }
}

export function Teacher({
  expression = 'neutral',
  talking = false,
  size = 320,
}: {
  expression?: Expression;
  talking?: boolean;
  size?: number;
}) {
  const rig = RIG[expression];
  const [mouthOpen, setMouthOpen] = useState(false);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!talking) {
      setMouthOpen(false);
      return;
    }
    const id = setInterval(() => setMouthOpen((o) => !o), 140 + Math.random() * 60);
    return () => clearInterval(id);
  }, [talking]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2500 + Math.random() * 3000);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  const mouth: Mouth = talking && mouthOpen && rig.mouth !== 'laugh' ? 'talk' : rig.mouth;

  return (
    <svg viewBox="0 0 450 440" width={size} height={(size * 440) / 450} className={`teacher teacher-${expression}`} role="img" aria-label={`Teacher, ${expression}`}>
      <defs>
        <pattern id="stubble" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1" fill={C.stubble} />
          <circle cx="4.5" cy="4.2" r="0.9" fill={C.stubble} />
        </pattern>
        <clipPath id="mic-clip">
          <circle cx={286} cy={404} r={31} />
        </clipPath>
        <clipPath id="face-clip">
          <path d="M118 140 C116 222 136 282 180 304 C224 282 244 222 242 140 Z" />
        </clipPath>
      </defs>

      <g className="t-body">
        {/* torso / tee */}
        <path d="M20 440 Q24 372 70 350 Q110 334 148 326 L212 326 Q252 334 292 350 Q338 372 342 440 Z" fill={C.shirt} />
        <path d="M20 440 Q24 372 70 350 Q90 342 104 338 Q80 380 84 440 Z" fill={C.shirtShade} />
        <path d="M180 360 L180 440" stroke={C.shirtShade} strokeWidth={2} />
        {/* left arm relaxed */}
        <path d="M56 356 Q30 380 26 440 L64 440 Q66 398 82 372 Z" fill={C.shirt} stroke={C.shirtShade} strokeWidth={2} />
        {/* neck */}
        <path d="M150 268 L210 268 L212 330 Q180 342 148 330 Z" fill={C.skinShade} />
        <path d="M146 326 Q180 344 214 326" stroke={C.shirtShade} strokeWidth={4} fill="none" />
      </g>

      <g className="t-head">
        {/* ears */}
        <ellipse cx={116} cy={200} rx={12} ry={22} fill={C.skin} />
        <ellipse cx={244} cy={200} rx={12} ry={22} fill={C.skin} />
        <path d="M112 190 Q118 200 113 212" stroke={C.skinShade} strokeWidth={3} fill="none" />
        <path d="M248 190 Q242 200 247 212" stroke={C.skinShade} strokeWidth={3} fill="none" />
        <circle cx={248} cy={216} r={3.6} fill="#fff" stroke="#ccc" strokeWidth={0.8} />

        {/* face */}
        <path d="M118 140 C116 222 136 282 180 304 C224 282 244 222 242 140 Z" fill={C.skin} />
        <g clipPath="url(#face-clip)">
          {/* stubble beard along the jaw + moustache, goatee patch under the lip */}
          <path d="M118 210 C124 262 150 300 180 306 C210 300 236 262 242 210 C232 240 214 252 180 254 C146 252 128 240 118 210 Z" fill="url(#stubble)" opacity={0.85} />
          <path d="M160 246 Q180 238 200 246 Q180 244 160 246 Z" fill="url(#stubble)" />
          <ellipse cx={180} cy={284} rx={15} ry={11} fill={C.stubble} opacity={0.55} />
          <ellipse cx={140} cy={226} rx={14} ry={9} fill="#d9876a" opacity={0.35} />
          <ellipse cx={220} cy={226} rx={14} ry={9} fill="#d9876a" opacity={0.35} />
        </g>
        {/* nose */}
        <path d="M182 196 Q186 214 190 228 Q182 236 172 232 Q176 220 178 200 Z" fill={C.skinShade} />
        <path d="M170 232 Q180 238 192 232" stroke={C.skinDeep} strokeWidth={2} fill="none" strokeLinecap="round" />

        <Eye cx={153} kind={rig.eyes} blink={blink && rig.eyes !== 'happy'} />
        <Eye cx={207} kind={rig.eyes} blink={blink && rig.eyes !== 'happy'} />
        <Brows kind={rig.brows} />
        <MouthShape kind={mouth} />

        {/* hair: faded sides, then the curly top */}
        <path d="M116 176 Q108 140 118 118 L132 130 Q126 150 126 176 Z" fill={C.hair} opacity={0.55} />
        <path d="M244 176 Q252 140 242 118 L228 130 Q234 150 234 176 Z" fill={C.hair} opacity={0.55} />
        <path d="M112 140 C104 84 132 34 186 28 C238 26 268 74 258 140 C240 128 220 124 180 124 C140 124 124 130 112 140 Z" fill={C.hair} />
        {CURLS.map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill={C.hair} />
            <path d={`M${x - r * 0.55} ${y + r * 0.1} A${r * 0.55} ${r * 0.55} 0 1 1 ${x + r * 0.2} ${y + r * 0.5}`} stroke={C.curl} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>

      <Arm kind={rig.arm} />

      {/* podcast microphone */}
      <g className="t-mic">
        <path d="M300 410 L430 360" stroke="#1b1b1b" strokeWidth={8} strokeLinecap="round" />
        <circle cx={286} cy={404} r={34} fill="#121212" />
        <g clipPath="url(#mic-clip)">
          {[-18, -9, 0, 9, 18].map((d) => (
            <path key={d} d={`M${250 + d * 0.3} ${400 + d} L${322 + d * 0.3} ${376 + d}`} stroke="#2e2e2e" strokeWidth={2.5} />
          ))}
        </g>
        <ellipse cx={274} cy={388} rx={10} ry={6} fill="#3a3a3a" opacity={0.6} />
      </g>
    </svg>
  );
}

export const EXPRESSIONS = Object.keys(RIG) as Expression[];

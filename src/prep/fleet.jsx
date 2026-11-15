/**
 * The four spacecraft a player can fly.
 *
 * Every ship carries the same six departments and the same starting numbers —
 * the choice is cosmetic, and the prep screen says so out loud. What changes is
 * the silhouette and the accent colour, which then follow the player into the
 * mission so the ship they picked is the ship they fly.
 *
 * Each hull is drawn as its own shape rather than one shape in four colours, so
 * the four read as different craft at a glance.
 */

const BAY_ROWS = [0, 1];
const BAY_COLS = [0, 1, 2];

/** The six department bays, drawn identically inside every hull. */
function Bays({ x, y, w, h, accent, gap = 10 }) {
  const bw = (w - gap * 2) / 3;
  const bh = (h - gap) / 2;
  return (
    <g>
      {BAY_ROWS.map(row => BAY_COLS.map(col => {
        const bx = x + col * (bw + gap);
        const by = y + row * (bh + gap);
        return (
          <g key={`${row}-${col}`}>
            <rect x={bx} y={by} width={bw} height={bh} rx="7"
              fill="#0E1A2E" stroke={accent} strokeWidth="1.6" opacity="0.9"/>
            <circle cx={bx + bw / 2} cy={by + bh / 2} r="4.5"
              fill="none" stroke={accent} strokeWidth="1.5"/>
            <circle cx={bx + bw / 2} cy={by + bh / 2} r="1.4" fill={accent}/>
          </g>
        );
      }))}
    </g>
  );
}

function NamePlate({ x, y, w, accent, label }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height="18" rx="9" fill="#071021" stroke={accent} strokeWidth="1.2" opacity="0.95"/>
      <text x={x + w / 2} y={y + 13} textAnchor="middle" fill={accent}
        fontSize="10.5" fontWeight="700" letterSpacing="2.4"
        fontFamily="'Space Grotesk', system-ui, sans-serif">{label}</text>
    </g>
  );
}

/** A docking mast with a beacon, shared by the hulls that carry one. */
function Mast({ x, y, accent, spread = 26 }) {
  return (
    <g>
      <path d={`M${x - spread} ${y + 34}L${x} ${y + 10}L${x + spread} ${y + 34}`}
        fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
      <circle cx={x} cy={y} r="10" fill={accent}/>
      <circle cx={x} cy={y} r="10" fill="none" stroke="#071021" strokeWidth="1.5"/>
    </g>
  );
}

/* ------------------------------------------------------------------ ships */

/** Explorer — a compact lander: angled hull, tall legs, built to touch down. */
export function ExplorerArt({ accent = '#5CE1F2', label = 'SMP // EXPLORER' }) {
  return (
    <svg viewBox="0 0 420 270" className="ship-art" role="img" aria-label="Explorer, a compact lander with angled sides and tall landing legs">
      <g stroke={accent}>
        <path d="M74 208 56 250M346 208l18 42" strokeWidth="7" strokeLinecap="round" opacity="0.5"/>
        <path d="M40 250h34M346 250h34" strokeWidth="7" strokeLinecap="round" opacity="0.5"/>
      </g>
      <Mast x={210} y={28} accent={accent}/>
      <path d="M96 62h228l34 46v88a14 14 0 0 1-14 14H76a14 14 0 0 1-14-14v-88Z"
        fill="#101C31" stroke={accent} strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M62 108h296" stroke={accent} strokeWidth="2" opacity="0.5"/>
      <NamePlate x={140} y={78} w={140} accent={accent} label={label}/>
      <Bays x={86} y={116} w={248} h={82} accent={accent}/>
      <path d="M70 126v62M350 126v62" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity="0.55"/>
    </svg>
  );
}

/** Titan — a heavy cargo hauler: wide, braced, ribbed with container frames. */
export function TitanArt({ accent = '#FFA23A', label = 'SMP // TITAN' }) {
  return (
    <svg viewBox="0 0 420 270" className="ship-art" role="img" aria-label="Titan, a wide heavy cargo ship with corner braces and four stubby legs">
      <g stroke={accent} strokeWidth="7" strokeLinecap="round" opacity="0.5">
        <path d="M86 210v34M150 210v34M270 210v34M334 210v34"/>
        <path d="M70 244h32M134 244h32M254 244h32M318 244h32"/>
      </g>
      <Mast x={210} y={30} accent={accent} spread={20}/>
      <path d="M48 70h324v138a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8Z"
        fill="#101C31" stroke={accent} strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M48 70 70 54h280l22 16" fill="#15233C" stroke={accent} strokeWidth="2.5" strokeLinejoin="round"/>
      <g stroke={accent} strokeWidth="2" opacity="0.45">
        <path d="M48 104h324M66 70v146M354 70v146"/>
      </g>
      <NamePlate x={140} y={82} w={140} accent={accent} label={label}/>
      <Bays x={82} y={118} w={256} h={80} accent={accent}/>
    </svg>
  );
}

/** Horizon — a modular habitat: domed pressure hull inside an orbit ring. */
export function HorizonArt({ accent = '#C79BFF', label = 'SMP // HORIZON' }) {
  return (
    <svg viewBox="0 0 420 270" className="ship-art" role="img" aria-label="Horizon, a rounded modular habitat inside a ring, resting on three legs">
      <g stroke={accent} strokeWidth="7" strokeLinecap="round" opacity="0.5">
        <path d="M120 206 96 246M300 206l24 40M210 214v32"/>
        <path d="M78 246h36M306 246h36M192 246h36"/>
      </g>
      <Mast x={210} y={26} accent={accent} spread={22}/>
      <ellipse cx="210" cy="140" rx="188" ry="52" fill="none" stroke={accent} strokeWidth="2" opacity="0.35"
        transform="rotate(-9 210 140)"/>
      <path d="M210 56c70 0 128 26 128 58v86a12 12 0 0 1-12 12H94a12 12 0 0 1-12-12v-86c0-32 58-58 128-58Z"
        fill="#101C31" stroke={accent} strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M86 112c34-18 78-27 124-27s90 9 124 27" fill="none" stroke={accent} strokeWidth="2" opacity="0.5"/>
      <NamePlate x={140} y={84} w={140} accent={accent} label={label}/>
      <Bays x={92} y={120} w={236} h={78} accent={accent}/>
    </svg>
  );
}

/** Nova — a survey vessel: swept delta hull with sensor wings and skids. */
export function NovaArt({ accent = '#6FE3A0', label = 'SMP // NOVA' }) {
  return (
    <svg viewBox="0 0 420 270" className="ship-art" role="img" aria-label="Nova, a sleek swept survey vessel with sensor wings and landing skids">
      <g stroke={accent} strokeWidth="7" strokeLinecap="round" opacity="0.5">
        <path d="M110 206 78 246M310 206l32 40"/>
        <path d="M58 246h44M318 246h44"/>
      </g>
      <Mast x={210} y={28} accent={accent} spread={24}/>
      <g stroke={accent} strokeWidth="2.5" opacity="0.6" fill="#15233C">
        <path d="M62 128 18 150l44 20Z"/>
        <path d="M358 128l44 22-44 20Z"/>
      </g>
      <path d="M126 62h168l44 54-22 92a12 12 0 0 1-12 10H116a12 12 0 0 1-12-10L82 116Z"
        fill="#101C31" stroke={accent} strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M86 116h248" stroke={accent} strokeWidth="2" opacity="0.5"/>
      <NamePlate x={140} y={80} w={140} accent={accent} label={label}/>
      <Bays x={96} y={122} w={228} h={78} accent={accent}/>
    </svg>
  );
}

export const SHIPS = [
  {
    id: 'explorer',
    name: 'Explorer',
    tagline: 'Compact lander',
    blurb: 'Small, steady and quick to set down. A good first ship.',
    accent: '#5CE1F2',
    Art: ExplorerArt,
  },
  {
    id: 'titan',
    name: 'Titan',
    tagline: 'Heavy cargo ship',
    blurb: 'Built wide to carry a lot. Braced for rough landings.',
    accent: '#FFA23A',
    Art: TitanArt,
  },
  {
    id: 'horizon',
    name: 'Horizon',
    tagline: 'Modular habitat',
    blurb: 'A rounded home in orbit or on the ground. Roomy inside.',
    accent: '#C79BFF',
    Art: HorizonArt,
  },
  {
    id: 'nova',
    name: 'Nova',
    tagline: 'Survey vessel',
    blurb: 'Sleek, with sensor wings for looking around before you land.',
    accent: '#6FE3A0',
    Art: NovaArt,
  },
];

export const DEFAULT_SHIP = SHIPS[0];

export function shipById(id) {
  return SHIPS.find(ship => ship.id === id) ?? DEFAULT_SHIP;
}

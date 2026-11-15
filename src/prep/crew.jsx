/**
 * The six astronauts a player places into departments.
 *
 * There is one for every department, so no department is ever left closed —
 * placing the crew is about who fits where, not about which rooms to give up.
 * Each one is drawn from the same friendly base — big helmet, round visor, soft
 * suit — and then given its own accent colour, skin tone, visor shape and chest
 * patch, so a child can tell them apart instantly and remember who went where.
 *
 * `home` is the department an astronaut trained for. Putting someone in their
 * home department is the tidy choice and the UI says so, but every astronaut
 * can work anywhere: no placement is ever wrong, and none of this changes the
 * simulation's arithmetic.
 */

function Astronaut({ accent, skin, patch, visor, name }) {
  const label = `${name}, an astronaut in a suit with ${patch} markings`;
  return (
    <svg viewBox="0 0 120 150" className="crew-art" role="img" aria-label={label}>
      {/* backpack */}
      <rect x="28" y="66" width="64" height="52" rx="18" fill="#1B2840"/>
      {/* arms */}
      <g fill="#E8EEF8">
        <rect x="12" y="74" width="22" height="46" rx="11"/>
        <rect x="86" y="74" width="22" height="46" rx="11"/>
      </g>
      <g fill={accent}>
        <rect x="12" y="104" width="22" height="16" rx="8"/>
        <rect x="86" y="104" width="22" height="16" rx="8"/>
      </g>
      {/* body */}
      <rect x="30" y="70" width="60" height="58" rx="20" fill="#F2F6FC"/>
      {/* chest panel — the quickest way to tell six suits apart */}
      {patch === 'square' && <rect x="46" y="84" width="28" height="20" rx="6" fill={accent}/>}
      {patch === 'round' && <circle cx="60" cy="94" r="12" fill={accent}/>}
      {patch === 'chevron' && <path d="M46 102l14-18 14 18-14-6Z" fill={accent}/>}
      {patch === 'bars' && (
        <g fill={accent}>
          <rect x="44" y="84" width="32" height="6" rx="3"/>
          <rect x="44" y="94" width="32" height="6" rx="3"/>
          <rect x="44" y="104" width="20" height="6" rx="3"/>
        </g>
      )}
      {patch === 'triangle' && <path d="M60 82l15 24H45Z" fill={accent}/>}
      {patch === 'dots' && (
        <g fill={accent}>
          <circle cx="50" cy="88" r="5"/><circle cx="70" cy="88" r="5"/>
          <circle cx="50" cy="102" r="5"/><circle cx="70" cy="102" r="5"/>
        </g>
      )}
      {/* legs */}
      <g fill="#E8EEF8">
        <rect x="36" y="122" width="20" height="24" rx="9"/>
        <rect x="64" y="122" width="20" height="24" rx="9"/>
      </g>
      {/* helmet */}
      <circle cx="60" cy="48" r="36" fill="#F2F6FC"/>
      <circle cx="60" cy="48" r="36" fill="none" stroke={accent} strokeWidth="3"/>
      {/* visor */}
      {visor === 'wide'
        ? <rect x="31" y="32" width="58" height="34" rx="17" fill="#0C1A2C"/>
        : <circle cx="60" cy="48" r="27" fill="#0C1A2C"/>}
      {/* face behind the glass */}
      <circle cx="60" cy="50" r="18" fill={skin}/>
      <g fill="#20160F">
        <circle cx="53" cy="47" r="2.6"/>
        <circle cx="67" cy="47" r="2.6"/>
      </g>
      <path d="M53 56a8 8 0 0 0 14 0" fill="none" stroke="#20160F" strokeWidth="2.4" strokeLinecap="round"/>
      {/* visor glint */}
      <path d="M40 40c4-6 11-10 18-11" fill="none" stroke="#9FD6EA" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
      {/* helmet trim */}
      <path d="M24 48a36 36 0 0 1 72 0" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

export const CREW = [
  {
    id: 'ari',
    name: 'Ari',
    role: 'Life support engineer',
    home: 'lifeSupport',
    likes: 'Keeping the air clean and the crew breathing',
    accent: '#FFA23A',
    skin: '#C98A5E',
    patch: 'square',
    visor: 'round',
  },
  {
    id: 'juno',
    name: 'Juno',
    role: 'Botanist',
    home: 'greenhouse',
    likes: 'Growing food that actually tastes good',
    accent: '#6FE3A0',
    skin: '#8D5A36',
    patch: 'round',
    visor: 'wide',
  },
  {
    id: 'rhea',
    name: 'Rhea',
    role: 'Power technician',
    home: 'power',
    likes: 'Saving a little charge for a rainy day',
    accent: '#FFD166',
    skin: '#5A3722',
    patch: 'triangle',
    visor: 'wide',
  },
  {
    id: 'sol',
    name: 'Sol',
    role: 'Geologist',
    home: 'science',
    likes: 'Collecting the strangest rocks',
    accent: '#5CE1F2',
    skin: '#6B4226',
    patch: 'bars',
    visor: 'wide',
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'Medic',
    home: 'shield',
    likes: 'Making sure everyone sleeps enough',
    accent: '#C79BFF',
    skin: '#F0C9A4',
    patch: 'chevron',
    visor: 'round',
  },
  {
    id: 'milo',
    name: 'Milo',
    role: 'Comms officer',
    home: 'comms',
    likes: 'Talking to Earth and waiting for the reply',
    accent: '#FF9ECF',
    skin: '#E0A878',
    patch: 'dots',
    visor: 'round',
  },
];

export function CrewArt({ member, size = 96 }) {
  return (
    <span className="crew-art-wrap" style={{ width: size, height: size * 1.25 }}>
      <Astronaut {...member}/>
    </span>
  );
}

export function crewById(id) {
  return CREW.find(member => member.id === id) ?? null;
}

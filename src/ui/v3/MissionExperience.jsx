import { useReducer, useState } from 'react';
import CutawaySceneC from '../../scene/CutawaySceneC.jsx';
import {
  c3BatteryCapacity, c3Debrief, c3UpgradeCost,
  EXPEDITIONS_C3, METERS_C3, ROOMS_C3,
} from '../../logic/v3/engine.js';
import { initC3Session, reduceC3Session, previewC3 } from './controller.js';
import ScienceCard from '../ScienceCard.jsx';
import VerifiedFact from '../VerifiedFact.jsx';
import cards from '../../data/cards.json';
import { chooseScienceCard, scienceCardForHistory } from '../science-content.js';
import {
  IconAir, IconArrowDown, IconArrowRight, IconArrowUp, IconBattery, IconBolt,
  IconCheck, IconClock, IconEva, IconInfo, IconPatch, IconReplay, IconScience, IconShield,
  IconSupplies, IconWarning, METER_ICONS, ROOM_ICONS,
} from '../icons.jsx';
import { shipById } from '../../prep/fleet.jsx';
import { CrewArt, crewById } from '../../prep/crew.jsx';
import './experience.css';

const ROOM_NAMES = {
  lifeSupport: 'Life Support', greenhouse: 'Greenhouse', power: 'Power Station',
  science: 'Science Lab', shield: 'Storm Shelter', comms: 'Communications',
};

const ROOM_DESCRIPTIONS = {
  lifeSupport: 'Makes the Air your crew breathes, and looks after how they feel.',
  greenhouse: 'Grows food under lamps. What you grow today arrives as Supplies tomorrow.',
  power: 'Charges the battery with Energy you do not spend. Stored Energy is used automatically when a day falls short.',
  science: 'Runs experiments to earn Research Points, and sends the crew out on EVA tasks.',
  shield: 'Prepares the protected room. Powering it keeps your crew safer when a storm hits.',
  comms: 'Sends a question to Earth. The answer takes a couple of days to come back.',
};

const BENEFITS = {
  lifeSupport: 'Each Energy unit here makes more Air today.',
  greenhouse: 'Power now, food tomorrow. Nothing grows in the dark.',
  science: 'Every Energy unit earns Research Points you can spend on upgrades.',
  shield: 'Shelter power blocks storm damage to Crew Safety.',
};

const METER_LABELS = { air: 'Air', supplies: 'Supplies', safety: 'Crew Safety' };
const METER_CAUSE = {
  air: 'Move Energy into Life Support, or upgrade it so it uses less Air.',
  supplies: 'Power the Greenhouse today, or send the crew out to fetch a supply cache.',
  safety: 'Power the Storm Shelter, schedule crew care, or run outpost maintenance.',
};

const WEATHER = ['Quiet', 'Minor', 'Moderate', 'Severe'];

const EXPEDITION_PAYOFF = {
  supplies: 'Supplies', research: 'Research', safety: 'Crew Safety',
};

/** Swap raw engine room keys for the names a child reads on screen. */
function humanise(text) {
  let out = String(text);
  for (const [key, name] of Object.entries(ROOM_NAMES)) {
    out = out.replaceAll(key, name);
  }
  return out.charAt(0).toUpperCase() + out.slice(1);
}

function Meter({ name, value, config, low }) {
  const Icon = METER_ICONS[name];
  const percent = Math.round((value / config.meterMax) * 100);
  return (
    <div className={`meter meter--${name}${low ? ' is-low' : ''}`}>
      <div className="meter__head">
        <Icon size={18}/>
        <span>{METER_LABELS[name]}</span>
        <strong>{value}/{config.meterMax}</strong>
      </div>
      <span className="meter__rail" role="img"
        aria-label={`${METER_LABELS[name]}: ${value} of ${config.meterMax} game units`}>
        <span className="meter__fill" style={{ width: `${percent}%` }}/>
      </span>
    </div>
  );
}

function DayDots({ day, total }) {
  return (
    <span className="day-dots" role="img" aria-label={`Day ${day} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const state = n < day ? ' is-done' : n === day ? ' is-now' : '';
        return <span key={n} className={state.trim()}/>;
      })}
    </span>
  );
}

function TopBar({ config, session, preview }) {
  const { game } = session;
  const low = config.reevaluation.c3.advisor.lowMeterThreshold;
  const capacity = c3BatteryCapacity(game, config);
  const generation = preview.generation ?? 0;
  const used = preview.used ?? 0;
  const left = Math.max(0, generation - used);
  const tone = used > generation ? 'c3-stat--over' : left === 0 ? 'c3-stat--tight' : 'c3-stat--ok';
  return (
    <header className="c3-topbar">
      <div className="c3-topbar__title">
        <small className="eyebrow">Moonbase · mission control</small>
        <strong>Day {game.day} <span>of {config.missionLengthDays}</span></strong>
        <DayDots day={game.day} total={config.missionLengthDays}/>
      </div>
      <div className="c3-topbar__meters">
        {METERS_C3.map(key => (
          <Meter key={key} name={key} value={game.meters[key]} config={config}
            low={game.meters[key] <= low}/>
        ))}
      </div>
      <div className="c3-topbar__economy">
        <span className={`c3-stat ${tone}`}>
          <small>Energy left</small>
          <strong>{left}<span> of {generation}</span></strong>
        </span>
        <span className="c3-stat">
          <small>Battery</small>
          <strong>{game.battery}<span> of {capacity}</span></strong>
        </span>
        <span className="c3-stat c3-stat--research">
          <small>Research</small>
          <strong>{game.research.available}</strong>
        </span>
      </div>
    </header>
  );
}

function Stepper({ label, value, range, onDelta, note, canAdd = true }) {
  return (
    <div className="c3-block">
      <div className="c3-block__head">
        <h3>{label}</h3>
        <small>up to {range[1]}</small>
      </div>
      <div className="stepper">
        <button type="button" disabled={value <= range[0]} aria-label={`Give less Energy to ${label}`}
          onClick={() => onDelta(-1)}>−</button>
        <output aria-live="polite" aria-label={`${label}: ${value} Energy`}>{value}</output>
        <button type="button" disabled={value >= range[1] || !canAdd} aria-label={`Give more Energy to ${label}`}
          onClick={() => onDelta(1)}>+</button>
      </div>
      {note && <p className="c3-help">{note}</p>}
    </div>
  );
}

function UpgradeBlock({ room, session, config, dispatch }) {
  const { game, plan } = session;
  const level = game.roomLevels[room];
  const maxLevel = config.reevaluation.c3.upgrades.maxLevel;
  const cost = c3UpgradeCost(room, game, config);
  const selected = plan.upgradeRoom === room;
  const elsewhere = plan.upgradeRoom && plan.upgradeRoom !== room;
  const affordable = cost ? game.research.available >= cost.points : false;
  return (
    <div className="c3-block">
      <div className="c3-block__head">
        <h3>Upgrade this room</h3>
        <small>Level {level} of {maxLevel}</small>
      </div>
      <div className="c3-pips" aria-hidden="true">
        {Array.from({ length: maxLevel }, (_, i) => (
          <span key={i} className={i < level ? 'is-on' : undefined}/>
        ))}
      </div>
      {cost ? (
        <>
          <p>
            Next level costs <strong>{cost.points} Research</strong> and <strong>{cost.energy} Energy</strong>.
            It is built tonight and helps from tomorrow.
          </p>
          <button type="button" className="option" aria-pressed={selected}
            disabled={!selected && (!affordable || Boolean(elsewhere))}
            onClick={() => dispatch({ type: 'UPGRADE', room })}>
            {selected
              ? `Upgrade planned for tonight — tap to cancel`
              : affordable
                ? `Plan ${ROOM_NAMES[room]} Level ${cost.nextLevel}`
                : `Needs ${cost.points} Research — you have ${game.research.available}`}
          </button>
          {elsewhere && !selected && (
            <p className="c3-help">An upgrade is already planned for {ROOM_NAMES[plan.upgradeRoom]} today.</p>
          )}
        </>
      ) : <p>This room is already at its top level.</p>}
    </div>
  );
}

function CrewCare({ session, config, dispatch }) {
  const c = config.reevaluation.c3.care;
  const selected = session.plan.care;
  const resting = session.game.lastCareDay !== null
    && session.game.day - session.game.lastCareDay <= c.cooldownDays;
  return (
    <div className="c3-block">
      <h3>Crew care</h3>
      <p>Give the crew a rest day. Restores up to {c.safetyGain} Crew Safety.</p>
      <button type="button" className="option" aria-pressed={selected} disabled={!selected && resting}
        onClick={() => dispatch({ type: 'CARE' })}>
        {resting && !selected
          ? 'The crew is still resting from last time'
          : selected ? 'Crew care is planned — tap to cancel' : 'Schedule crew care'}
        <span>Costs {c.energyCost} Energy and {c.suppliesCost} Supplies</span>
      </button>
      <p className="c3-help">Crew Safety is how ready the crew feels. It is not a measure of radiation exposure.</p>
    </div>
  );
}

function PowerBlock({ session, config, preview, dispatch }) {
  const c = config.reevaluation.c3.battery;
  const { game, plan } = session;
  const capacity = c3BatteryCapacity(game, config);
  const maxCharge = Math.min(c.maxChargePerDay, capacity - game.battery);
  const spare = preview.freeGeneration ?? 0;
  return (
    <>
      <div className="c3-block">
        <h3>Energy today</h3>
        <div className="c3-block__head">
          <p>Made: <strong>{preview.generation ?? 0}</strong></p>
          <p>Spare right now: <strong>{spare}</strong></p>
        </div>
        <span className="c3-battery" role="img"
          aria-label={`Battery: ${game.battery} of ${capacity} cells charged`}>
          {Array.from({ length: Math.max(capacity, 1) }, (_, i) => (
            <span key={i} className={i < game.battery ? 'is-charged' : undefined}/>
          ))}
        </span>
        <p>Battery: <strong>{game.battery} of {capacity} charged</strong></p>
        {(preview.batteryDraw ?? 0) > 0 && (
          <p className="notice">
            <IconBattery size={18}/>
            <span>Today's plan needs {preview.batteryDraw} stored Energy. The battery covers it automatically.</span>
          </p>
        )}
      </div>
      <Stepper label="Store Energy today" value={plan.charge} range={[0, Math.max(0, maxCharge)]}
        canAdd={spare > 0 && plan.charge < maxCharge}
        onDelta={delta => dispatch({ type: 'CHARGE', delta })}
        note="Only spare Energy can be stored. Anything left unstored is lost at midnight."/>
      {!config.powerBudget.sunlitDays.includes(game.day + 1) && game.day < config.missionLengthDays && (
        <p className="notice notice--warn">
          <IconWarning size={18}/>
          <span>From tomorrow the outpost makes less Energy. Store some now if you can.</span>
        </p>
      )}
    </>
  );
}

function ExpeditionBlock({ session, config, dispatch }) {
  const { game, plan } = session;
  const active = game.expedition.active;
  const tasks = config.reevaluation.c3.expeditions;
  return (
    <div className="c3-block">
      <h3>Send the crew outside</h3>
      <p className="c3-help">An EVA takes days and costs resources up front. Pick one.</p>
      {active ? (
        <p className="notice" role="status">
          <IconEva size={18}/>
          <span>Crew away on {tasks[active.kind].label.toLowerCase()}. They return after Day {active.dueDay}.</span>
        </p>
      ) : (
        <div className="c3-option-list">
          {EXPEDITIONS_C3.map(kind => {
            const task = tasks[kind];
            const selected = plan.expedition === kind;
            const reward = Object.entries(task.reward)
              .map(([key, value]) => `+${value} ${EXPEDITION_PAYOFF[key] ?? key}`).join(', ');
            return (
              <button type="button" key={kind} className="option" aria-pressed={selected}
                onClick={() => dispatch({ type: 'EXPEDITION', kind })}>
                {selected ? `${task.label} — chosen, tap to cancel` : task.label}
                <span>Costs {task.airCost} Air · {task.suppliesCost} Supplies · {task.energyCost} Energy</span>
                <span>Back in {task.duration} day{task.duration === 1 ? '' : 's'} with {reward}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="c3-help">Rewards are simplified game resources, not NASA measurements.</p>
    </div>
  );
}

function CommsBlock({ session, config, dispatch }) {
  const c = config.reevaluation.c3.comms;
  const { comms } = session.game;
  const selected = session.plan.requestAdvice;
  const advice = comms.lastAdvice;
  return (
    <>
      <div className="c3-block">
        <h3>Ask Earth for advice</h3>
        {comms.pending ? (
          <p className="notice" role="status">
            <IconClock size={18}/>
            <span>
              Your question is on its way. Expect a reply after Day {comms.pending.dueDay}.
              {comms.pending.postponed ? ' A storm already delayed it once.' : ''}
            </span>
          </p>
        ) : (
          <button type="button" className="option" aria-pressed={selected}
            onClick={() => dispatch({ type: 'ADVICE' })}>
            {selected ? 'Question ready to send — tap to cancel' : 'Send a question to Earth'}
            <span>Costs {c.sendEnergyCost} Energy · reply takes a couple of days</span>
          </button>
        )}
        <p className="c3-help">
          The delay stands for the time people on Earth need to study your question. A storm can hold a reply up once.
        </p>
      </div>
      {advice && (
        <div className="c3-block" aria-live="polite">
          <small className="eyebrow">Earth response · received Day {advice.receivedDay}</small>
          <p>{advice.message}</p>
          <p>
            Suggested upgrade: <strong>
              {advice.recommendedUpgrade ? ROOM_NAMES[advice.recommendedUpgrade] : 'every room is already at its top level'}
            </strong>
          </p>
          <p className="c3-help">
            {advice.weatherEstimate === null
              ? 'No weather guess came with this reply.'
              : `Possible game weather for Day ${advice.usableOnDay}: ${WEATHER[advice.weatherEstimate]}. This is a game estimate, not an official NASA forecast.`}
          </p>
        </div>
      )}
      <VerifiedFact factId="fact-comm-delay"/>
    </>
  );
}

function RoomPanel({ session, config, preview, dispatch, crew }) {
  const room = session.selectedRoom;
  const Icon = ROOM_ICONS[room];
  const allocatable = Object.hasOwn(session.plan.allocation, room);
  const remaining = (preview.available ?? 0) - (preview.used ?? 0);
  return (
    <aside className="c3-panel" aria-label={`${ROOM_NAMES[room]} controls`}>
      <div className="c3-panel__head">
        <small className="eyebrow">Selected room · level {session.game.roomLevels[room]}</small>
        <h2><Icon size={26}/>{ROOM_NAMES[room]}</h2>
        <p>{ROOM_DESCRIPTIONS[room]}</p>
        {crew && (
          <span className="c3-panel__crew" style={{ '--crew-accent': crew.accent }}>
            <CrewArt member={crew} size={42}/>
            <span>
              <strong>{crew.name} is on duty here</strong>
              <small>{crew.role} · {crew.likes}</small>
            </span>
          </span>
        )}
      </div>

      {allocatable && (
        <Stepper label={`${ROOM_NAMES[room]} Energy`} value={session.plan.allocation[room]}
          range={config.allocationRanges[room]} note={BENEFITS[room]} canAdd={remaining >= 1}
          onDelta={delta => dispatch({ type: 'ALLOCATE', consumer: room, delta })}/>
      )}

      {room === 'lifeSupport' && <CrewCare session={session} config={config} dispatch={dispatch}/>}
      {room === 'power' && <PowerBlock session={session} config={config} preview={preview} dispatch={dispatch}/>}
      {room === 'science' && (
        <>
          <div className="c3-block">
            <div className="c3-block__head">
              <h3>Research</h3>
              <small>score {session.game.research.earned}</small>
            </div>
            <p>Left to spend: <strong>{session.game.research.available} Points</strong></p>
            <p className="c3-help">Spending Points on upgrades never lowers your lifetime research score.</p>
          </div>
          <ExpeditionBlock session={session} config={config} dispatch={dispatch}/>
        </>
      )}
      {room === 'shield' && <VerifiedFact factId="fact-shielding"/>}
      {room === 'comms' && <CommsBlock session={session} config={config} dispatch={dispatch}/>}

      <UpgradeBlock room={room} session={session} config={config} dispatch={dispatch}/>

      <nav className="c3-rooms-list" aria-label="Jump to another room">
        {ROOMS_C3.map(key => {
          const RoomIcon = ROOM_ICONS[key];
          return (
            <button type="button" key={key} aria-pressed={key === room}
              onClick={() => dispatch({ type: 'SELECT_ROOM', room: key })}>
              <RoomIcon size={18}/>
              <span>{ROOM_NAMES[key]}<small>Level {session.game.roomLevels[key]}</small></span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function Porthole() {
  return (
    <svg className="c3-porthole" viewBox="0 0 460 460" role="img"
      aria-label="The view through a porthole: a lunar outpost of linked modules on the Moon's surface, with Earth low in the black sky">
      <defs><clipPath id="c3-porthole-clip"><circle cx="230" cy="230" r="186"/></clipPath></defs>
      <circle cx="230" cy="230" r="216" fill="#0B1424" stroke="var(--seam)" strokeWidth="2"/>
      <circle cx="230" cy="230" r="201" fill="none" stroke="var(--seam-lit)" strokeWidth="10"/>
      <g fill="#54718F">
        <circle cx="230" cy="19" r="5"/><circle cx="441" cy="230" r="5"/>
        <circle cx="230" cy="441" r="5"/><circle cx="19" cy="230" r="5"/>
        <circle cx="379" cy="81" r="4"/><circle cx="379" cy="379" r="4"/>
        <circle cx="81" cy="379" r="4"/><circle cx="81" cy="81" r="4"/>
      </g>
      <g clipPath="url(#c3-porthole-clip)">
        <rect x="44" y="44" width="372" height="372" fill="#05080F"/>
        <g fill="#C9DBF2">
          <circle cx="110" cy="100" r="1.8"/><circle cx="180" cy="72" r="1.2"/>
          <circle cx="262" cy="96" r="1.6"/><circle cx="330" cy="130" r="1.2"/>
          <circle cx="368" cy="196" r="1.7"/><circle cx="96" cy="176" r="1.3"/>
        </g>
        <circle cx="348" cy="112" r="26" fill="#17406E"/>
        <path d="M330 96c8 2 10 8 18 7s12-6 18 0c-3 14-15 24-30 24-10 0-18-4-23-11 5-6 9-16 17-20Z" fill="#2F7F5B"/>
        <circle cx="348" cy="112" r="26" fill="none" stroke="#7FB4E8" strokeWidth="1.4"/>
        <path d="M44 318c54-22 96-14 150-24 60-11 108 6 222-10v132H44Z" fill="#1A2334"/>
        <path d="M44 340c70-16 120-6 180-14 58-8 112 4 192-6v96H44Z" fill="#242F43"/>
        <ellipse cx="120" cy="392" rx="40" ry="9" fill="#1A2334"/>
        <rect x="118" y="286" width="72" height="46" rx="16" fill="#0F1A2C" stroke="var(--cyan)" strokeWidth="2"/>
        <rect x="198" y="286" width="72" height="46" rx="16" fill="#0F1A2C" stroke="var(--cyan)" strokeWidth="2"/>
        <rect x="278" y="286" width="62" height="46" rx="16" fill="#0F1A2C" stroke="var(--cyan)" strokeWidth="2"/>
        <rect x="158" y="332" width="150" height="34" rx="14" fill="#0F1A2C" stroke="var(--seam-lit)" strokeWidth="2"/>
        <circle cx="154" cy="309" r="7" fill="var(--air)"/>
        <circle cx="234" cy="309" r="7" fill="var(--supplies)"/>
        <circle cx="309" cy="309" r="7" fill="var(--safety)"/>
        <path d="M92 296h22v30H92z" fill="#15243C" stroke="var(--cyan)" strokeWidth="1.6"/>
        <path d="M92 306h22M103 296v30" stroke="var(--cyan)" strokeWidth="1"/>
        <path d="M340 300v-26" stroke="var(--seam-lit)" strokeWidth="2"/>
        <path d="M330 274a10 7 0 0 1 20 0Z" fill="#15243C" stroke="var(--cyan)" strokeWidth="1.6"/>
      </g>
    </svg>
  );
}

function MissionBar({ children }) {
  return (
    <header className="c3-bar">
      <span className="c3-bar__brand">
        <IconPatch size={40}/>
        <span>
          <strong>ORBITAL</strong>
          <small>Junior Astronaut Mission Trainer</small>
        </span>
      </span>
      <span className="c3-bar__spacer"/>
      <span className="chip chip--data"><IconCheck size={14}/>Archived NASA data</span>
      {children}
    </header>
  );
}

function Briefing({ config, mission, ship, prep, onStart }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const ShipArt = ship?.Art;
  const crewOnDuty = prep
    ? ROOMS_C3.filter(room => prep.assignments[room]).map(room => ({ room, member: crewById(prep.assignments[room]) }))
    : [];
  const starting = {
    air: config.startingMeters.air,
    supplies: config.startingMeters.food,
    safety: config.reevaluation.startingSafety,
  };
  return (
    <main className="c3-intro-wrap starfield">
      <MissionBar/>
      <div className="c3-intro">
        <div className="c3-intro__main">
          <div>
            <span className="chip chip--storm">Mission briefing · {mission.title}</span>
            <h1>Keep your Moon outpost alive for {config.missionLengthDays} days.</h1>
            <p className="c3-intro__lede">
              You are the commander. Every morning you decide where the outpost's <strong>Energy</strong> goes.
              Every evening you see what happened to your crew.
            </p>
          </div>

          <section aria-labelledby="c3-protect">
            <h2 id="c3-protect" className="c3-h2">Three things to protect</h2>
            <div className="c3-goals">
              <div className="c3-goal c3-goal--air">
                <IconAir size={30}/>
                <strong>Air</strong>
                <p>Life Support makes it. Without it the crew cannot breathe.</p>
                <span>Starts at {starting.air} of {config.meterMax}</span>
              </div>
              <div className="c3-goal c3-goal--supplies">
                <IconSupplies size={30}/>
                <strong>Supplies</strong>
                <p>Food from the Greenhouse. Grown today, eaten tomorrow.</p>
                <span>Starts at {starting.supplies} of {config.meterMax}</span>
              </div>
              <div className="c3-goal c3-goal--safety">
                <IconShield size={30}/>
                <strong>Crew Safety</strong>
                <p>How ready your crew feels. Storms and tired days lower it.</p>
                <span>Starts at {starting.safety} of {config.meterMax}</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="c3-loop">
            <h2 id="c3-loop" className="c3-h2">How one day works</h2>
            <ol className="c3-steps">
              <li><b>1</b><strong>Pick a room</strong><span>Tap any of the six rooms in your outpost.</span></li>
              <li><b>2</b><strong>Give it Energy</strong><span>You have one shared Energy budget each day.</span></li>
              <li><b>3</b><strong>Run the day</strong><span>Space weather arrives. Your plan meets reality.</span></li>
              <li><b>4</b><strong>Read the report</strong><span>Learn what worked, then plan a smarter tomorrow.</span></li>
            </ol>
            <p className="c3-help">
              The Science Lab also earns <strong>Research Points</strong>. Spend them to upgrade any room up to
              Level {config.reevaluation.c3.upgrades.maxLevel}, store spare Energy in the battery, or send the
              crew outside on an EVA task.
            </p>
          </section>

          <div className="c3-launch">
            <button type="button" className="btn-primary" onClick={onStart}>
              Start mission<IconArrowRight size={22}/>
            </button>
            <button type="button" className="btn-secondary" aria-expanded={helpOpen}
              onClick={() => setHelpOpen(open => !open)}>
              <IconInfo size={20}/>What do these words mean?
            </button>
            <small>{config.missionLengthDays} days · about 10 minutes</small>
          </div>

          {helpOpen && (
            <div className="c3-glossary">
              <p><strong>Energy</strong> — the power your outpost makes each day. Spend it, or store a little in the battery.</p>
              <p><strong>Shelter</strong> — a protected room. Powering it keeps the crew safer during a storm.</p>
              <p><strong>Research Points</strong> — what the Science Lab earns. Spend them to upgrade rooms.</p>
              <p><strong>Game units</strong> — simple numbers made for practice, not real spacecraft measurements.</p>
            </div>
          )}
        </div>

        <div className="c3-intro__side">
          {ship ? (
            <figure className="c3-myship" style={{ '--ship-accent': ship.accent }}>
              <ShipArt accent={ship.accent}/>
              <figcaption>
                <strong>{ship.name}</strong>
                <span>{ship.tagline} · landing on {prep.destination === 'mars' ? 'Mars' : 'the Moon'}</span>
              </figcaption>
              <ul className="c3-myship__crew">
                {crewOnDuty.map(({ room, member }) => (
                  <li key={room} style={{ '--crew-accent': member.accent }}>
                    <CrewArt member={member} size={38}/>
                    <span><strong>{member.name}</strong><small>{ROOM_NAMES[room]}</small></span>
                  </li>
                ))}
              </ul>
            </figure>
          ) : <Porthole/>}
          <ScienceCard card={chooseScienceCard(cards, { stage: 'briefing' })}/>
        </div>
      </div>
      <footer className="c3-foot">
        <small>
          All meters, upgrade costs and EVA rewards are simplified game units. Space-weather records come from {mission.dataSource}.
        </small>
        <small>An independent educational project. NASA does not endorse this game.</small>
      </footer>
    </main>
  );
}

function Delta({ name, delta, after, config }) {
  const Icon = METER_ICONS[name];
  const tone = delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat';
  const Arrow = delta > 0 ? IconArrowUp : delta < 0 ? IconArrowDown : IconArrowRight;
  return (
    <div className={`c3-delta c3-delta--${name}`}>
      <span className="c3-delta__name"><Icon size={19}/>{METER_LABELS[name]}</span>
      <strong className={`c3-delta__value ${tone}`}>{delta > 0 ? '+' : ''}{delta}</strong>
      <span className="c3-delta__arrow">
        {after - delta}<Arrow size={15}/><strong>{after}</strong> of {config.meterMax}
      </span>
      <span className="meter__rail" aria-hidden="true">
        <span className="meter__fill" style={{ width: `${Math.round((after / config.meterMax) * 100)}%` }}/>
      </span>
    </div>
  );
}

function Report({ config, session, onContinue }) {
  const { reveal, game } = session;
  const h = reveal.history;
  const stormDamage = config.stormDamage[String(h.stormLevel)];
  const shieldEnergy = h.allocation.shield;
  const blocked = Math.min(stormDamage, config.shieldProtection * shieldEnergy);
  const advice = game.comms.lastAdvice;
  const forecast = advice && advice.usableOnDay === reveal.day && advice.weatherEstimate !== null
    ? advice.weatherEstimate : null;
  const lowest = METERS_C3.reduce((worst, key) =>
    reveal.after[key] < reveal.after[worst] ? key : worst, METERS_C3[0]);
  const survived = game.status === 'running';
  return (
    <main className="c3-report-wrap starfield">
      <header className="c3-bar">
        <small className="eyebrow">Day {reveal.day} of {config.missionLengthDays} · mission report</small>
        <DayDots day={reveal.day} total={config.missionLengthDays}/>
        <span className="c3-bar__spacer"/>
        <span className="chip chip--data"><IconCheck size={14}/>Archived NASA data</span>
      </header>

      <div className="c3-report">
        <div className="c3-report__main">
          <div>
            <h1>{survived
              ? `Your crew made it through Day ${reveal.day}.`
              : `Day ${reveal.day} ended the mission.`}</h1>
            <p className="c3-report__lede">
              {shieldEnergy > 0 && blocked > 0
                ? `The shelter was powered when the ${WEATHER[h.stormLevel].toLowerCase()} storm arrived, so it absorbed ${blocked} of the ${stormDamage} damage.`
                : h.stormLevel > 0
                  ? `The shelter had no Energy, so the ${WEATHER[h.stormLevel].toLowerCase()} storm reached your crew.`
                  : 'Space weather stayed quiet today, so nothing hit the crew.'}
              {' '}
              {METER_LABELS[lowest]} is the thing to watch tomorrow.
            </p>
          </div>

          <section aria-labelledby="c3-changed">
            <h2 id="c3-changed" className="c3-h2">What changed today</h2>
            <div className="c3-delta-grid">
              {METERS_C3.map(key => (
                <Delta key={key} name={key} delta={h.meterDeltas[key]} after={reveal.after[key]} config={config}/>
              ))}
            </div>
          </section>

          <section aria-labelledby="c3-weather">
            <h2 id="c3-weather" className="c3-h2">The space weather, and your choice</h2>
            <div className="c3-scale" role="img"
              aria-label={`Storm level: ${WEATHER[h.stormLevel]}, level ${h.stormLevel} of ${config.stormLevelRange[1]}`}>
              {WEATHER.map((name, level) => (
                <span key={name} className={level === h.stormLevel ? 'is-now' : undefined}>{name}</span>
              ))}
            </div>
            <div className="c3-compare">
              <div>
                <small>Earth guessed</small>
                <strong className="is-said">{forecast === null ? 'No guess' : WEATHER[forecast]}</strong>
                <p>{forecast === null
                  ? 'You ran this day without asking Earth.'
                  : 'A game estimate, and estimates can be off by one level.'}</p>
              </div>
              <div>
                <small>What arrived</small>
                <strong className="is-real">{WEATHER[h.stormLevel]}</strong>
                <p>{stormDamage} damage, aimed at Crew Safety.</p>
              </div>
              <div>
                <small className="is-saved">Your shelter</small>
                <strong className="is-saved">{shieldEnergy} Energy</strong>
                <p>{shieldEnergy > 0
                  ? `Blocked ${blocked} of it.`
                  : `An unpowered shelter also costs ${config.zeroShieldSafetyPenalty} Crew Safety.`}</p>
              </div>
            </div>
            <p className="c3-help">
              Storm levels are a simplified 0–{config.stormLevelRange[1]} game scale built from archived records. They are not a lunar radiation dose.
            </p>
          </section>

          <section aria-labelledby="c3-energy-went">
            <h2 id="c3-energy-went" className="c3-h2">Where your Energy went</h2>
            <ul className="c3-feedback-list">
              {Object.entries(h.allocation).map(([room, value]) => (
                <li key={room}>
                  <IconBolt size={18}/>
                  <span><strong>{ROOM_NAMES[room]}</strong> ran on {value} Energy.</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="c3-happened">
            <h2 id="c3-happened" className="c3-h2">What else happened</h2>
            {h.events.length ? (
              <ul className="c3-feedback-list">
                {h.events.map((event, i) => (
                  <li key={i}><IconCheck size={18}/><span>{humanise(event)}</span></li>
                ))}
              </ul>
            ) : <p className="c3-help">You followed your plan exactly, and nothing unexpected happened.</p>}
          </section>
        </div>

        <div className="c3-report__side">
          <section aria-labelledby="c3-ledger" className="c3-card">
            <h2 id="c3-ledger" className="c3-h2">Energy &amp; research</h2>
            <dl className="c3-ledger">
              <div><dt>Energy made</dt><dd>{h.energy.generated}</dd></div>
              <div><dt>Energy spent</dt><dd>{h.energy.used}</dd></div>
              <div><dt>Stored in battery</dt><dd className="is-stored">+{h.energy.stored}</dd></div>
              <div><dt>Taken from battery</dt><dd>{h.energy.drawn}</dd></div>
              <div><dt>Battery now</dt><dd>{h.energy.batteryAfter}</dd></div>
              <div><dt>Research earned</dt><dd className="is-research">+{h.research.gained}</dd></div>
              <div><dt>Research spent</dt><dd>{h.research.spent}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="c3-records" className="c3-card">
            <h2 id="c3-records" className="c3-h2">Archived space-weather records</h2>
            <p>Today's storm level came from real records NASA stored on <strong>{h.date}</strong>.</p>
            {reveal.sourceEvents.length ? (
              <>
                <ul className="c3-source-list">
                  {reveal.sourceEvents.slice(0, 3).map((event, i) => (
                    <li key={`${event.sourceId}-${i}`}>
                      <strong>{event.label}</strong>
                      <small>NASA DONKI ID: {event.sourceId}</small>
                    </li>
                  ))}
                </ul>
                {reveal.sourceEvents.length > 3 && (
                  <details className="c3-more-events">
                    <summary>Show {reveal.sourceEvents.length - 3} more archived records</summary>
                    <ul className="c3-source-list">
                      {reveal.sourceEvents.slice(3).map((event, i) => (
                        <li key={`${event.sourceId}-extra-${i}`}>
                          <strong>{event.label}</strong>
                          <small>NASA DONKI ID: {event.sourceId}</small>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            ) : <p>No event records were listed for this day.</p>}
          </section>

          <ScienceCard card={scienceCardForHistory(cards, game.history, config)}/>
        </div>
      </div>

      <footer className="c3-footer">
        <div className="c3-footer__plan">
          <strong>One thing to try tomorrow</strong>
          <p>{METER_LABELS[lowest]} is your lowest meter at {reveal.after[lowest]} of {config.meterMax}. {METER_CAUSE[lowest]}</p>
        </div>
        <button type="button" className="btn-primary" onClick={onContinue}>
          {survived ? `Plan Day ${game.day}` : 'See the debrief'}<IconArrowRight size={22}/>
        </button>
      </footer>
    </main>
  );
}

function Debrief({ config, session, mission, onRestart, onReconfigure }) {
  const result = c3Debrief(session.game, mission);
  const won = result.status === 'succeeded';
  const reason = result.reason === 'objectives-not-met'
    ? `Your crew survived all ${config.missionLengthDays} days, but one resource finished below the mission goal of ${config.successMinMeter}.`
    : result.reason === 'air' ? 'The Air ran out. Try stronger Life Support, or upgrade it sooner.'
      : result.reason === 'supplies' ? 'The Supplies ran out. Power the Greenhouse earlier, or fetch a supply cache.'
        : result.reason === 'safety' ? 'Crew readiness fell too low. Combine shelter power with crew care or maintenance.'
          : `Air, Supplies and Crew Safety all finished above the mission goal of ${config.successMinMeter}. That is a full success, Commander.`;

  const lessons = [];
  if (result.researchAvailable > 0) {
    lessons.push(`${result.researchAvailable} Research Point${result.researchAvailable === 1 ? '' : 's'} went unspent. Points saved at the end do not help your crew.`);
  }
  if (result.upgrades.shield === config.reevaluation.c3.upgrades.initialLevel) {
    lessons.push('You never upgraded the Storm Shelter. Each level blocks more damage, which frees Energy for Science.');
  }
  if (result.expeditionsCompleted === 0) {
    lessons.push('You never sent the crew outside. An EVA costs resources up front but pays back more than it takes.');
  }
  if (result.pendingRequest) {
    lessons.push('A question to Earth was still travelling when the mission ended. Ask early so the reply is useful.');
  }
  if (!lessons.length) {
    lessons.push('You used every system the outpost has. Try the same mission with less Energy spent on Science.');
  }

  return (
    <main className="c3-report-wrap starfield">
      <header className="c3-bar">
        <small className="eyebrow">Mission debrief · {mission.title}</small>
        <span className="c3-bar__spacer"/>
        <small style={{ fontSize: 12, color: 'var(--ink-4)' }}>
          {result.daysCompleted} of {config.missionLengthDays} days completed
        </small>
      </header>

      <div className="c3-report">
        <div className="c3-report__side">
          <div className="c3-verdict">
            <IconPatch size={164} label="Mission patch: a crescent Moon above a lunar outpost"/>
            <span className={won ? 'chip chip--data' : 'chip'}>
              {won && <IconCheck size={15}/>}{won ? 'Mission achieved' : 'Mission ended'}
            </span>
            <h1>{won ? `Your outpost survived all ${config.missionLengthDays} days.` : 'Your crew came home. The outpost did not hold.'}</h1>
            <p>{reason}</p>
          </div>
          <div className="c3-restart">
            <button type="button" className="btn-primary" onClick={onRestart}>
              <IconReplay size={21}/>Fly it again
            </button>
            {onReconfigure && (
              <button type="button" className="btn-secondary" onClick={onReconfigure}>
                Change ship &amp; crew
              </button>
            )}
          </div>
        </div>

        <div className="c3-report__main">
          <section aria-labelledby="c3-final">
            <h2 id="c3-final" className="c3-h2">How your crew finished</h2>
            <div className="c3-delta-grid">
              {METERS_C3.map(key => {
                const Icon = METER_ICONS[key];
                const value = result.meters[key];
                const met = value >= config.successMinMeter;
                return (
                  <div key={key} className={`c3-delta c3-delta--${key}`}>
                    <span className="c3-delta__name"><Icon size={19}/>{METER_LABELS[key]}</span>
                    <strong className="c3-delta__value is-flat">{value}<span style={{ fontSize: 16, color: 'var(--ink-3)' }}>/{config.meterMax}</span></strong>
                    <span className="meter__rail" aria-hidden="true">
                      <span className="meter__fill" style={{ width: `${Math.round((value / config.meterMax) * 100)}%` }}/>
                    </span>
                    <small style={{ color: met ? 'var(--ok)' : 'var(--alert-soft)' }}>
                      {met ? `Above the goal of ${config.successMinMeter}` : `Below the goal of ${config.successMinMeter}`}
                    </small>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="c3-earned">
            <h2 id="c3-earned" className="c3-h2">What you earned</h2>
            <div className="c3-badges">
              <div className="c3-badge c3-badge--research">
                <IconScience size={30}/>
                <span>
                  <strong>{result.researchScore}</strong>
                  <small>Research score · {result.researchAvailable} unspent</small>
                </span>
              </div>
              <div className="c3-badge c3-badge--eva">
                <IconEva size={30}/>
                <span>
                  <strong>{result.expeditionsCompleted}</strong>
                  <small>EVA task{result.expeditionsCompleted === 1 ? '' : 's'} completed outside</small>
                </span>
              </div>
              <div className="c3-badge c3-badge--storm">
                <IconBattery size={30}/>
                <span>
                  <strong>{result.batteryRemaining}</strong>
                  <small>Energy still in the battery</small>
                </span>
              </div>
            </div>
          </section>

          <section aria-labelledby="c3-rooms">
            <h2 id="c3-rooms" className="c3-h2">Your outpost at the end</h2>
            <div className="c3-level-grid">
              {ROOMS_C3.map(room => {
                const Icon = ROOM_ICONS[room];
                const level = result.upgrades[room];
                const upgraded = level > config.reevaluation.c3.upgrades.initialLevel;
                return (
                  <div key={room} className={upgraded ? 'is-upgraded' : undefined}>
                    <Icon size={18}/>{ROOM_NAMES[room]}<strong>Lv {level}</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="c3-next">
            <h2 id="c3-next" className="c3-h2">Try a different plan next time</h2>
            <ul className="c3-feedback-list">
              {lessons.slice(0, 3).map((lesson, i) => (
                <li key={i}><b>{String(i + 1).padStart(2, '0')}</b><span>{lesson}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <footer className="c3-foot">
        <small>
          Space-weather events: {result.source}. Meters, upgrade costs and EVA rewards are simplified game units, not measurements.
        </small>
        <small>An independent educational project. NASA does not endorse this game.</small>
      </footer>
    </main>
  );
}

export default function MissionExperienceC({ config, mission, prep, onReconfigure }) {
  const [session, dispatch] = useReducer(
    (state, action) => reduceC3Session(state, action, config, mission),
    null,
    () => initC3Session(config, mission),
  );

  // Mission prep is optional: without it the game runs on the config defaults.
  const ship = prep ? shipById(prep.shipId) : null;
  const assignments = prep?.assignments ?? {};

  if (session.screen === 'briefing') {
    return <Briefing config={config} mission={mission} ship={ship} prep={prep}
      onStart={() => dispatch({ type: 'START' })}/>;
  }
  if (session.screen === 'report') {
    return <Report config={config} session={session} onContinue={() => dispatch({ type: 'CONTINUE' })}/>;
  }
  if (session.screen === 'debrief') {
    return <Debrief config={config} session={session} mission={mission}
      onRestart={() => dispatch({ type: 'RESTART' })} onReconfigure={onReconfigure}/>;
  }

  const preview = previewC3(session, config);
  const { game, plan } = session;
  const generation = preview.generation ?? 0;
  const used = preview.used ?? 0;
  const left = Math.max(0, generation - used);
  const extra = Math.max(0, used - Object.values(plan.allocation).reduce((a, b) => a + b, 0));
  const advice = game.comms.lastAdvice;
  const forecast = advice && advice.usableOnDay === game.day && advice.weatherEstimate !== null
    ? advice.weatherEstimate : null;
  const sunlit = config.powerBudget.sunlitDays.includes(game.day);
  const tone = used > generation ? 'is-over' : left === 0 ? 'is-tight' : '';

  return (
    <main className="c3-app starfield">
      <TopBar config={config} session={session} preview={preview}/>

      <div className="c3-situation">
        {forecast === null ? (
          <span className="chip"><IconInfo size={18}/>No weather guess for today</span>
        ) : (
          <span className={forecast >= 2 ? 'chip chip--storm pulse' : 'chip chip--storm'}>
            <IconWarning size={18}/>Storm guess: {WEATHER[forecast]}
          </span>
        )}
        <p>
          {forecast === null
            ? <>Space weather is uncertain. Ask Earth from the Communications room, or decide for yourself — powering the shelter is always the safe choice.</>
            : <>Earth thinks today could be <strong>{WEATHER[forecast]}</strong>. Guesses can be off by one level, so the shelter is still worth Energy.</>}
        </p>
        <button type="button" className="btn-secondary" onClick={() => dispatch({ type: 'RESTART' })}>
          <IconReplay size={18}/>Restart mission
        </button>
      </div>

      <div className="c3-main-grid">
        <CutawaySceneC config={config} session={session} ship={ship} assignments={assignments}
          onSelectRoom={room => dispatch({ type: 'SELECT_ROOM', room })}/>
        <RoomPanel config={config} session={session} preview={preview} dispatch={dispatch}
          crew={crewById(assignments[session.selectedRoom])}/>
      </div>

      <footer className="c3-footer">
        <div className="c3-footer__plan">
          <div className="c3-footer__head">
            <strong>Today's Energy plan</strong>
            <span className={tone}>{used} of {generation} used</span>
          </div>
          <div className="c3-budget" aria-hidden="true">
            {Object.entries(plan.allocation).map(([room, value]) => (
              <span key={room} className={`for-${room}`} style={{ flexGrow: value }}/>
            ))}
            <span className="for-extra" style={{ flexGrow: extra }}/>
            <span className="is-free" style={{ flexGrow: left }}/>
          </div>
          <p>
            {sunlit ? 'Sunlit day — full generation. ' : 'Lunar night — the outpost makes less Energy. '}
            Battery holds {game.battery}, and {left} unit{left === 1 ? '' : 's'} {left === 1 ? 'is' : 'are'} still unassigned.
          </p>
          {session.error && <p className="c3-error" role="alert">{session.error}</p>}
        </div>
        <button type="button" className="btn-primary" disabled={!preview.ok}
          onClick={() => dispatch({ type: 'COMMIT' })}>
          Run this day<IconArrowRight size={22}/>
        </button>
      </footer>
    </main>
  );
}

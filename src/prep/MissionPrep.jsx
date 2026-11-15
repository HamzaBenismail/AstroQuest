import { useMemo, useState } from 'react';
import { ROOMS_C3 } from '../logic/v3/engine.js';
import { ROOM_NAMES, ROOM_TAGLINES } from '../ui/rooms.js';
import { ROOM_ICONS, IconAir, IconArrowLeft, IconArrowRight, IconBattery, IconCheck, IconInfo, IconSupplies } from '../ui/icons.jsx';
import { SHIPS, shipById } from './fleet.jsx';
import { CREW, CrewArt, crewById } from './crew.jsx';
import './prep.css';

const STEPS = [
  { id: 'ship', label: 'Spacecraft' },
  { id: 'destination', label: 'Destination' },
  { id: 'crew', label: 'Crew' },
];

const DESTINATIONS = [
  {
    id: 'moon',
    name: 'Moon',
    tagline: 'Lunar mission',
    note: 'The real archived space-weather records in this mission are from the Moon.',
    playable: true,
  },
  {
    id: 'mars',
    name: 'Mars',
    tagline: 'Visual training preview',
    note: 'Mars changes how the outpost looks, not what happens. The mission still runs on the archived lunar records.',
    playable: false,
  },
];

/* ----------------------------------------------------------- step 1: ship */

function ShipSelect({ shipId, onPick, onNext }) {
  return (
    <>
      <header className="prep-head">
        <p className="prep-eyebrow">Mission preparation · step 1 of 3</p>
        <h1>Choose your spacecraft</h1>
        <p className="prep-lede">Every great mission starts with a ship.</p>
      </header>

      <ul className="prep-ships">
        {SHIPS.map(ship => {
          const selected = ship.id === shipId;
          const { Art } = ship;
          return (
            <li key={ship.id}>
              <button type="button" className="prep-ship" aria-pressed={selected}
                style={{ '--ship-accent': ship.accent }}
                onClick={() => onPick(ship.id)}>
                {selected && (
                  <span className="prep-ship__tick" aria-hidden="true"><IconCheck size={16}/></span>
                )}
                <span className="prep-ship__art"><Art accent={ship.accent}/></span>
                <span className="prep-ship__name">{ship.name}</span>
                <span className="prep-ship__tagline">{ship.tagline}</span>
                <span className="prep-ship__blurb">{ship.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="prep-note">
        <IconInfo size={17}/>
        <span>Ship designs are cosmetic. All four carry the same six departments and the same supplies.</span>
      </p>

      <div className="prep-actions">
        <button type="button" className="btn-primary" onClick={onNext}>
          Prepare mission<IconArrowRight size={22}/>
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------- step 2: destination + cargo */

function CargoRow({ icon: Icon, name, value, max, min, onDelta, spare, unit }) {
  return (
    <div className="prep-cargo__row">
      <span className="prep-cargo__name"><Icon size={19}/>{name}</span>
      <strong className="prep-cargo__value">{value}<span> / {max}{unit ? ` ${unit}` : ''}</span></strong>
      <span className="meter__rail" aria-hidden="true">
        <span className="meter__fill" style={{ width: `${Math.round((value / max) * 100)}%` }}/>
      </span>
      <span className="prep-cargo__buttons">
        <button type="button" disabled={value <= min} aria-label={`Load less ${name}`}
          onClick={() => onDelta(-1)}>−</button>
        <button type="button" disabled={value >= max || spare <= 0} aria-label={`Load more ${name}`}
          onClick={() => onDelta(1)}>+</button>
      </span>
    </div>
  );
}

function DestinationStep({ config, shipId, destination, onDestination, cargo, setCargo, limits, onBack, onNext }) {
  const ship = shipById(shipId);
  const { Art } = ship;
  const spare = limits.total - (cargo.air + cargo.supplies + cargo.battery);
  const change = (key, delta) => {
    setCargo(prev => {
      const next = prev[key] + delta;
      const bounds = limits[key];
      if (next < bounds.min || next > bounds.max) return prev;
      if (delta > 0 && spare <= 0) return prev;
      return { ...prev, [key]: next };
    });
  };
  return (
    <>
      <header className="prep-head prep-head--row">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <IconArrowLeft size={17}/>Ships
        </button>
        <div>
          <p className="prep-eyebrow">Mission preparation · step 2 of 3</p>
          <h1>Where are we landing?</h1>
        </div>
      </header>

      <ul className="prep-worlds">
        {DESTINATIONS.map(world => {
          const selected = world.id === destination;
          return (
            <li key={world.id}>
              <button type="button" className={`prep-world prep-world--${world.id}`} aria-pressed={selected}
                onClick={() => onDestination(world.id)}>
                <span className="prep-world__badge">{selected ? <><IconCheck size={14}/>Selected</> : 'Select'}</span>
                <span className="prep-world__body">
                  <strong>{world.name}</strong>
                  <span>{world.tagline}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className={destination === 'mars' ? 'notice notice--warn' : 'notice'}>
        <IconInfo size={18}/>
        <span>{DESTINATIONS.find(world => world.id === destination).note}</span>
      </p>

      <div className="prep-load">
        <figure className="prep-load__ship" style={{ '--ship-accent': ship.accent }}>
          <Art accent={ship.accent}/>
          <figcaption><strong>{ship.name}</strong><span>Your spacecraft</span></figcaption>
        </figure>

        <section className="prep-cargo" aria-labelledby="cargo-title">
          <div className="prep-cargo__head">
            <div>
              <p className="prep-eyebrow">Cargo bay</p>
              <h2 id="cargo-title">Load your supplies</h2>
            </div>
            <strong className={spare === 0 ? 'prep-cargo__total is-full' : 'prep-cargo__total'}>
              {limits.total - spare} / {limits.total}
            </strong>
          </div>
          <span className="meter__rail prep-cargo__bar" aria-hidden="true">
            <span className="meter__fill" style={{ width: `${Math.round(((limits.total - spare) / limits.total) * 100)}%` }}/>
          </span>

          <div className="prep-cargo__rows">
            <CargoRow icon={IconAir} name="Air" value={cargo.air} min={limits.air.min} max={limits.air.max}
              spare={spare} onDelta={delta => change('air', delta)}/>
            <CargoRow icon={IconSupplies} name="Supplies" value={cargo.supplies} min={limits.supplies.min}
              max={limits.supplies.max} spare={spare} onDelta={delta => change('supplies', delta)}/>
            <CargoRow icon={IconBattery} name="Battery" value={cargo.battery} min={limits.battery.min}
              max={limits.battery.max} spare={spare} onDelta={delta => change('battery', delta)}/>
          </div>

          <p className="prep-help" aria-live="polite">
            {spare > 0
              ? `More of one resource means less room for the others. ${spare} crate${spare === 1 ? '' : 's'} still to load.`
              : 'The cargo bay is full. Every crate is loaded.'}
          </p>
          <p className="prep-help">
            These become your starting Air, Supplies and Battery. All values are simplified game units.
          </p>
        </section>
      </div>

      <div className="prep-actions">
        <button type="button" className="btn-primary" disabled={spare !== 0} onClick={onNext}>
          {spare === 0 ? 'Meet your crew' : `Load ${spare} more crate${spare === 1 ? '' : 's'}`}
          {spare === 0 && <IconArrowRight size={22}/>}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ step 3: crew */

function CrewStep({ shipId, assignments, setAssignments, picked, setPicked, onBack, onLaunch }) {
  const ship = shipById(shipId);
  const [dragOver, setDragOver] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const placedIds = Object.values(assignments);
  const remaining = CREW.length - placedIds.length;

  const assign = (room, crewId) => {
    const member = crewById(crewId);
    if (!member) return;
    setAssignments(prev => {
      const next = {};
      for (const [key, value] of Object.entries(prev)) {
        if (value !== crewId) next[key] = value;
      }
      next[room] = crewId;
      return next;
    });
    setPicked(null);
    setAnnouncement(`${member.name} is now in ${ROOM_NAMES[room]}.`);
  };

  const clear = room => {
    const member = crewById(assignments[room]);
    setAssignments(prev => {
      const next = { ...prev };
      delete next[room];
      return next;
    });
    if (member) setAnnouncement(`${member.name} is back in the crew list.`);
  };

  return (
    <>
      <header className="prep-head prep-head--row">
        <button type="button" className="btn-secondary" onClick={onBack}>
          <IconArrowLeft size={17}/>Cargo
        </button>
        <div>
          <p className="prep-eyebrow">Mission preparation · step 3 of 3</p>
          <h1>Who works where?</h1>
        </div>
      </header>

      <p className="prep-lede prep-lede--wide">
        {/* Touch devices get the tap wording first: HTML5 dragging is a
            mouse-and-keyboard affordance and does nothing under a finger. */}
        <span className="prep-hint-drag">Drag an astronaut onto a department — or tap one, then tap the room.</span>
        <span className="prep-hint-tap">Tap an astronaut, then tap the department you want them in.</span>
        {' '}Four astronauts, six departments, so two rooms run on their own.
      </p>

      <div className="prep-crew-layout">
        <section className="prep-tray" aria-labelledby="tray-title">
          <div className="prep-tray__head">
            <h2 id="tray-title">Your crew</h2>
            <span className={remaining === 0 ? 'chip chip--data' : 'chip'}>
              {remaining === 0 ? <><IconCheck size={14}/>All placed</> : `${remaining} to place`}
            </span>
          </div>
          <ul className="prep-tray__list">
            {CREW.map(member => {
              const placedIn = Object.keys(assignments).find(room => assignments[room] === member.id);
              const isPicked = picked === member.id;
              return (
                <li key={member.id}>
                  <button type="button"
                    className={`prep-crew${isPicked ? ' is-picked' : ''}${placedIn ? ' is-placed' : ''}`}
                    style={{ '--crew-accent': member.accent }}
                    draggable
                    aria-pressed={isPicked}
                    aria-label={`${member.name}, ${member.role}${placedIn ? `, currently in ${ROOM_NAMES[placedIn]}` : ', not placed yet'}`}
                    onDragStart={event => {
                      event.dataTransfer.setData('text/plain', member.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setPicked(member.id);
                    }}
                    onDragEnd={() => setDragOver(null)}
                    onClick={() => setPicked(isPicked ? null : member.id)}>
                    <CrewArt member={member} size={84}/>
                    <strong>{member.name}</strong>
                    <small>{member.role}</small>
                    {placedIn && <span className="prep-crew__where">{ROOM_NAMES[placedIn]}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="prep-help">
            {picked
              ? `${crewById(picked).name} is ready — now choose a department.`
              : 'Tap an astronaut to pick them up.'}
          </p>
        </section>

        <section className="prep-depts" aria-labelledby="depts-title"
          style={{ '--ship-accent': ship.accent }}>
          <div className="prep-depts__head">
            <h2 id="depts-title">{ship.name} · departments</h2>
            <span className="prep-depts__plate">SMP // {ship.name.toUpperCase()}</span>
          </div>
          <ul className="prep-depts__grid">
            {ROOMS_C3.map(room => {
              const Icon = ROOM_ICONS[room];
              const member = crewById(assignments[room]);
              const isOver = dragOver === room;
              return (
                <li key={room}
                  className={`prep-dept${member ? ' is-filled' : ''}${isOver ? ' is-over' : ''}`}
                  style={member ? { '--crew-accent': member.accent } : undefined}
                  onDragOver={event => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOver(room);
                  }}
                  onDragLeave={() => setDragOver(current => (current === room ? null : current))}
                  onDrop={event => {
                    event.preventDefault();
                    const id = event.dataTransfer.getData('text/plain');
                    setDragOver(null);
                    if (id) assign(room, id);
                  }}>
                  <button type="button" className="prep-dept__drop"
                    aria-label={member
                      ? `${ROOM_NAMES[room]}, ${member.name} is here. Choose to swap in the picked astronaut.`
                      : `${ROOM_NAMES[room]}, empty. Choose to place the picked astronaut here.`}
                    onClick={() => { if (picked) assign(room, picked); }}>
                    <span className="prep-dept__label"><Icon size={20}/>{ROOM_NAMES[room]}</span>
                    {member
                      ? <span className="prep-dept__crew"><CrewArt member={member} size={56}/><strong>{member.name}</strong></span>
                      : <span className="prep-dept__empty">
                          <span className="prep-dept__ring" aria-hidden="true"/>
                          <small>{ROOM_TAGLINES[room]}</small>
                        </span>}
                  </button>
                  {member && (
                    <button type="button" className="prep-dept__clear"
                      aria-label={`Take ${member.name} out of ${ROOM_NAMES[room]}`}
                      onClick={() => clear(room)}>×</button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <p className="prep-visually-hidden" role="status" aria-live="polite">{announcement}</p>

      <div className="prep-actions">
        <button type="button" className="btn-primary" disabled={remaining !== 0} onClick={onLaunch}>
          {remaining === 0
            ? <>Launch the mission<IconArrowRight size={22}/></>
            : `Place ${remaining} more astronaut${remaining === 1 ? '' : 's'}`}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- the flow */

export function cargoLimits(config) {
  const base = {
    air: config.startingMeters.air,
    supplies: config.startingMeters.food,
    battery: config.reevaluation.c3.battery.initialCharge,
  };
  return {
    // The budget is the approved default total, so the default load reproduces
    // today's balance exactly. Players redistribute it; they never gain extra.
    total: base.air + base.supplies + base.battery,
    base,
    air: { min: 2, max: config.meterMax },
    supplies: { min: 2, max: config.meterMax },
    battery: { min: 0, max: config.reevaluation.c3.battery.baseCapacity },
  };
}

export default function MissionPrep({ config, onReady }) {
  const limits = useMemo(() => cargoLimits(config), [config]);
  const [step, setStep] = useState('ship');
  const [shipId, setShipId] = useState(SHIPS[0].id);
  const [destination, setDestination] = useState('moon');
  const [cargo, setCargo] = useState(limits.base);
  const [assignments, setAssignments] = useState({});
  const [picked, setPicked] = useState(null);

  const index = STEPS.findIndex(entry => entry.id === step);

  return (
    <main className="prep starfield">
      <nav className="prep-steps" aria-label="Mission preparation progress">
        <ol>
          {STEPS.map((entry, i) => (
            <li key={entry.id} className={i === index ? 'is-now' : i < index ? 'is-done' : undefined}
              aria-current={i === index ? 'step' : undefined}>
              <span>{i + 1}</span>{entry.label}
            </li>
          ))}
        </ol>
      </nav>

      <div className="prep-stage">
        {step === 'ship' && (
          <ShipSelect shipId={shipId} onPick={setShipId} onNext={() => setStep('destination')}/>
        )}
        {step === 'destination' && (
          <DestinationStep config={config} shipId={shipId} destination={destination}
            onDestination={setDestination} cargo={cargo} setCargo={setCargo} limits={limits}
            onBack={() => setStep('ship')} onNext={() => setStep('crew')}/>
        )}
        {step === 'crew' && (
          <CrewStep shipId={shipId} assignments={assignments} setAssignments={setAssignments}
            picked={picked} setPicked={setPicked} onBack={() => setStep('destination')}
            onLaunch={() => onReady({ shipId, destination, cargo, assignments })}/>
        )}
      </div>
    </main>
  );
}

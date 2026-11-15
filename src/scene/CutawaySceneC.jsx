/** Purely presentational cutaway. All room effects and costs come from the v3 engine. */
import { ROOMS_C3 } from '../logic/v3/engine.js';
import './cutaway-c.css';

const ROOM_LABELS = {
  lifeSupport: 'Life Support', greenhouse: 'Greenhouse', power: 'Power Station',
  science: 'Science Lab', shield: 'Storm Shelter', comms: 'Communications',
};

export default function CutawaySceneC({ config, session, onSelectRoom }) {
  const { game, plan, selectedRoom } = session;
  const limited = !config.powerBudget.sunlitDays.includes(game.day);
  const roomActive = room => room === 'comms' ? plan.requestAdvice || Boolean(game.comms.pending) :
    room === 'power' ? plan.charge > 0 || game.battery > 0 :
      room === 'lifeSupport' ? plan.care || plan.allocation.lifeSupport > 0 :
        Boolean(plan.allocation[room]);
  const onMove = event => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--c3-x', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 11}px`);
    event.currentTarget.style.setProperty('--c3-y', `${((event.clientY - bounds.top) / bounds.height - 0.5) * 7}px`);
  };
  return <section className="c3-scene" aria-label="Interactive six-room lunar outpost"
    data-low-air={game.meters.air <= config.successMinMeter ? 'true' : 'false'}
    data-power={limited ? 'reduced' : 'normal'}
    data-expedition={game.expedition.active ? 'active' : 'idle'}
    onPointerMove={onMove}
    onPointerLeave={e => { e.currentTarget.style.setProperty('--c3-x','0px'); e.currentTarget.style.setProperty('--c3-y','0px'); }}>
    <img className="c3-scene__art" src="/art/cutaway-base.svg" alt="" aria-hidden="true" draggable="false"/>
    <div className="c3-scene__rooms" role="group" aria-label="Select outpost room">
      {ROOMS_C3.map(room => <button type="button" key={room} className={`c3-scene__room c3-scene__room--${room}`}
        data-lit={roomActive(room) ? 'true' : 'false'} aria-pressed={selectedRoom === room}
        aria-label={`Manage ${ROOM_LABELS[room]}, level ${game.roomLevels[room]}`}
        onClick={() => onSelectRoom(room)}>
        <span className="c3-scene__label">{ROOM_LABELS[room]}</span>
        <span className="c3-scene__level">LV {game.roomLevels[room]}</span>
      </button>)}
    </div>
    <span className="c3-scene__top">LUNAR HABITAT · {limited ? 'REDUCED GENERATION' : 'STANDARD GENERATION'}</span>
    {game.meters.air <= config.successMinMeter && <span className="c3-scene__warning" role="status">LOW AIR · PRIORITIZE LIFE SUPPORT</span>}
    {game.expedition.active && <span className="c3-scene__eva">EVA AWAY · RETURN DAY {game.expedition.active.dueDay}</span>}
    <span className="c3-scene__foot">Original fictional habitat schematic · click a room to manage it</span>
  </section>;
}

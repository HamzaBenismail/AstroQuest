import { ROOMS } from '../ui/v2/controller.js';
import './cutaway.css';

export default function CutawayScene({ config, session, onSelectRoom }) {
  const { game, allocation, selectedRoom, forecast } = session;
  const limited = !config.powerBudget.sunlitDays.includes(game.day);
  const lowAir = game.meters.air <= config.successMinMeter;
  const active = key => allocation[key] > config.allocationRanges[key][0];
  const onPointerMove = event => {
    if (event.pointerType !== 'mouse') return;
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    target.style.setProperty('--parallax-x', `${x * 10}px`);
    target.style.setProperty('--parallax-y', `${y * 6}px`);
  };
  return <section className="cutaway" aria-label="Interactive lunar outpost rooms"
    data-power={limited ? 'reduced' : 'normal'}
    data-low-air={lowAir ? 'true' : 'false'}
    data-greenhouse={active('greenhouse') ? 'active' : 'idle'}
    data-shelter={active('shield') ? 'active' : 'idle'}
    data-science={active('science') ? 'active' : 'idle'}
    data-comms={game.comms.pending ? 'pending' : 'idle'}
    onPointerMove={onPointerMove}
    onPointerLeave={event => { event.currentTarget.style.setProperty('--parallax-x','0px'); event.currentTarget.style.setProperty('--parallax-y','0px'); }}>
    <img className="cutaway__art" src="/art/cutaway-base.svg" alt="" aria-hidden="true" draggable="false"/>
    <div className="cutaway__storm-glow" aria-hidden="true" data-forecast={forecast === config.stormLevelRange[1] ? 'warning' : 'quiet'}/>
    <div className="cutaway__room-grid" role="group" aria-label="Choose a room to manage">
      {ROOMS.map(room => <button key={room.id} type="button"
        className={`cutaway__room cutaway__room--${room.id}`}
        aria-label={`Select ${room.name}`}
        aria-pressed={room.id === selectedRoom}
        data-active={room.action ? (active(room.action) ? 'true' : 'false') : room.id === 'comms' ? (game.comms.pending ? 'true' : 'false') : 'false'}
        onClick={() => onSelectRoom(room.id)}>
        <span className="cutaway__room-label">{room.name}</span>
        <span className="cutaway__room-dot" aria-hidden="true"/>
      </button>)}
    </div>
    <div className="cutaway__overlay-label"><span className="cutaway__signal"/> HABITAT STATUS / {limited ? 'REDUCED POWER' : 'STANDARD POWER'}</div>
    {lowAir && <div className="cutaway__alert" role="status">LOW AIR — CHECK LIFE SUPPORT</div>}
    <p className="cutaway__caption">Cutaway illustration · select any room · all effects are simplified game visuals</p>
  </section>;
}

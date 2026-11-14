/**
 * Purely presentational cutaway of the outpost. All room effects and costs come
 * from the v3 engine; this file only reads state to decide what is lit.
 *
 * The habitat is drawn as six real <button> modules on a grid joined by corridor
 * rules, rather than hotspots floating over a bitmap: every module is reachable
 * by keyboard, scales with the viewport, and keeps its label legible.
 */
import { ROOMS_C3 } from '../logic/v3/engine.js';
import { IconBattery, IconBolt, IconClock, IconWarning, ROOM_ICONS } from '../ui/icons.jsx';
import './cutaway-c.css';

const ROOM_LABELS = {
  lifeSupport: 'Life Support', greenhouse: 'Greenhouse', power: 'Power Station',
  science: 'Science Lab', shield: 'Storm Shelter', comms: 'Communications',
};

const ROOM_TAGLINES = {
  lifeSupport: 'Makes Air', greenhouse: 'Grows Supplies', power: 'Stores Energy',
  science: 'Earns Research', shield: 'Protects the crew', comms: 'Asks Earth',
};

export default function CutawaySceneC({ config, session, onSelectRoom }) {
  const { game, plan, selectedRoom } = session;
  const limited = !config.powerBudget.sunlitDays.includes(game.day);
  const lowAir = game.meters.air <= config.successMinMeter;

  const isLit = room =>
    room === 'comms' ? plan.requestAdvice || Boolean(game.comms.pending)
      : room === 'power' ? plan.charge > 0 || game.battery > 0
        : room === 'lifeSupport' ? plan.care || plan.allocation.lifeSupport > 0
          : Boolean(plan.allocation[room]);

  const readout = room => {
    if (room === 'power') return { Icon: IconBattery, text: `${game.battery} stored` };
    if (room === 'comms') {
      return game.comms.pending
        ? { Icon: IconClock, text: `Reply Day ${game.comms.pending.dueDay}` }
        : { Icon: IconClock, text: 'Nothing sent' };
    }
    const value = plan.allocation[room] ?? 0;
    return { Icon: IconBolt, text: `${value} Energy` };
  };

  return (
    <section className="c3-scene" aria-label="Your lunar outpost"
      data-power={limited ? 'reduced' : 'normal'}>
      <div className="c3-scene__head">
        <span className="c3-scene__status">
          <span className={limited ? 'c3-scene__led is-reduced' : 'c3-scene__led'}/>
          {limited ? 'Lunar night · less Energy' : 'Sunlit · full generation'}
        </span>
        {lowAir && (
          <span className="c3-scene__warning pulse" role="status">
            <IconWarning size={16}/>Low Air — power Life Support
          </span>
        )}
        {game.expedition.active && (
          <span className="c3-scene__eva" role="status">
            Crew outside · back after Day {game.expedition.active.dueDay}
          </span>
        )}
        <span className="c3-scene__hint">Tap a room to give it Energy</span>
      </div>

      <div className="c3-scene__habitat">
        <span className="c3-scene__corridor c3-scene__corridor--v" aria-hidden="true"/>
        <span className="c3-scene__corridor c3-scene__corridor--h" aria-hidden="true"/>
        <div className="c3-scene__rooms" role="group" aria-label="Choose an outpost room">
          {ROOMS_C3.map(room => {
            const Icon = ROOM_ICONS[room];
            const { Icon: Readout, text } = readout(room);
            const selected = selectedRoom === room;
            const lit = isLit(room);
            return (
              <button type="button" key={room}
                className={`c3-scene__room c3-scene__room--${room}`}
                data-lit={lit ? 'true' : 'false'}
                aria-pressed={selected}
                aria-label={`${ROOM_LABELS[room]}, level ${game.roomLevels[room]}, ${text}`}
                onClick={() => onSelectRoom(room)}>
                <span className="c3-scene__row">
                  <Icon size={26}/>
                  <small className="c3-scene__level">Lv {game.roomLevels[room]}</small>
                </span>
                <strong className="c3-scene__name">{ROOM_LABELS[room]}</strong>
                <span className="c3-scene__tag">{ROOM_TAGLINES[room]}</span>
                <span className="c3-scene__readout"><Readout size={14}/>{text}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="c3-scene__ground" aria-hidden="true"/>
      <small className="c3-scene__foot">
        Original fictional habitat schematic · six modules joined by pressurised corridors
      </small>
    </section>
  );
}

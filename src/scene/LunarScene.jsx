/**
 * F5 — Read-only lunar-outpost scene. Uses the approved mission's recorded events.
 * The engine and UI controller remain the only authorities for game outcomes.
 * Motion is cosmetic: pointer coordinates update CSS variables, not React state.
 */
import { useRef } from 'react';
import './scene.css';

const ASSET_ROOT = '/art/';
const ROOMS = Object.freeze([
  { id: 'lifeSupport', label: 'Life support' },
  { id: 'shield', label: 'Shield' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'science', label: 'Science' },
]);
const SCENE_LAYERS = Object.freeze([
  { id: 'sky', asset: 'sky.svg', depth: 0 },
  { id: 'body', asset: 'earth.svg', depth: 5 },
  { id: 'rim', asset: 'crater-rim.svg', depth: 9 },
  { id: 'ground', asset: 'terrain.svg', depth: 13 },
  { id: 'outpost', asset: 'outpost.svg', depth: 17 },
  { id: 'effects', asset: 'shield.svg', depth: 17 },
  { id: 'foreground', asset: 'foreground.svg', depth: 24 },
]);

function setParallax(node, x, y) {
  node.style.setProperty('--pointer-x', String(x));
  node.style.setProperty('--pointer-y', String(y));
  for (const [index, layer] of SCENE_LAYERS.entries()) {
    node.style.setProperty(`--layer-x-${index}`, `${(x * layer.depth).toFixed(2)}px`);
    node.style.setProperty(`--layer-y-${index}`, `${(y * layer.depth).toFixed(2)}px`);
  }
}

export default function LunarScene({ config, session, onSelectRoom }) {
  const sceneRef = useRef(null);
  const reveal = session.screen === 'reveal' ? session.reveal : null;
  const day = reveal?.day ?? session.game.day;
  const night = !config.powerBudget.sunlitDays.includes(day);
  const allocation = session.allocation;
  const shieldActive = allocation.shield > config.allocationRanges.shield[0];
  const greenhouseActive = allocation.greenhouse > config.allocationRanges.greenhouse[0];
  const lowAir = session.game.meters.air <= config.successMinMeter;
  const stormActive = Boolean(reveal && reveal.actual > config.stormLevelRange[0]);
  const recordedEvent = reveal?.events?.find(event => typeof event.label === 'string' && event.label.trim() && typeof event.sourceId === 'string' && event.sourceId.trim());
  const greenhouseMax = config.allocationRanges.greenhouse[1];
  const plantProgress = greenhouseMax > 0 ? allocation.greenhouse / greenhouseMax : 0;

  function handlePointerMove(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setParallax(event.currentTarget, x, y);
  }

  function handlePointerLeave() {
    if (sceneRef.current) setParallax(sceneRef.current, 0, 0);
  }

  return (
    <section
      ref={sceneRef}
      className="lunar-scene"
      aria-label="Lunar outpost mission visualization"
      data-night={night ? 'true' : 'false'}
      data-power={night ? 'limited' : 'normal'}
      data-shield={shieldActive ? 'on' : 'off'}
      data-greenhouse={greenhouseActive ? 'on' : 'off'}
      data-low-air={lowAir ? 'true' : 'false'}
      data-storm={stormActive ? 'true' : 'false'}
      data-phase={session.screen}
      style={{ '--plant-height': 0.5 + plantProgress * 0.5 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="lunar-scene__background" aria-hidden="true"/>
      {SCENE_LAYERS.map(({ id, asset }, index) => (
        <div key={id} className={`scene-layer scene-layer--${id}`} data-layer={index} aria-hidden="true">
          <img className="scene-layer__base" src={`${ASSET_ROOT}${asset}`} alt="" draggable="false"/>
          {id === 'outpost' && (
            <>
              <img className="scene-outpost__lights" src={`${ASSET_ROOT}lights.svg`} alt="" draggable="false"/>
              <img className="scene-outpost__plants" src={`${ASSET_ROOT}greenhouse-plants.svg`} alt="" draggable="false"/>
              <img className="scene-outpost__air-warning" src={`${ASSET_ROOT}air-warning.svg`} alt="" draggable="false"/>
            </>
          )}
          {id === 'effects' && <span className="scene-effects__storm"/>}
        </div>
      ))}

      {onSelectRoom && (
        <div className="lunar-scene__rooms" aria-label="Choose an outpost room">
          {ROOMS.map(room => (
            <button key={room.id} type="button"
              className={`scene-room scene-room--${room.id}`}
              aria-label={`Go to ${room.label} power controls`}
              onClick={() => onSelectRoom(room.id)}>
              <span>{room.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="lunar-scene__status" aria-live="off">
        <span className="scene-chip">Day {day} / {config.missionLengthDays}</span>
        <span className="scene-chip">{night ? 'Simulated lunar night · reduced power' : 'Simulated sunlit days'}</span>
        {shieldActive && <span className="scene-chip">Shield powered</span>}
        {lowAir && <span className="scene-chip scene-chip--alert">Low air · check Life support</span>}
      </div>
      {stormActive && (
        <div className="lunar-scene__storm-banner" role="status">
          <strong>Storm recorded in the mission</strong>
          {recordedEvent ? (
            <span>{recordedEvent.label} <small>Archived NASA DONKI · ID: {recordedEvent.sourceId}</small></span>
          ) : (
            <span>Archived mission data indicates storm conditions. No source event label is available.</span>
          )}
        </div>
      )}
      <p className="lunar-scene__caption">Illustrated outpost · resource levels are simplified game units</p>
    </section>
  );
}

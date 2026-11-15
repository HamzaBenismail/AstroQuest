/** Visual-only interstitials. Uses the player's existing ship and landscape SVGs. */
import { useEffect, useRef, useState } from 'react';
import { CINEMATIC_DURATIONS, cinematicDestination, forecastMotion, launchPhases } from './cinematicRules.js';
import './cinematics.css';

const STORM_NAMES = Object.freeze({ quiet:'Quiet', minor:'Minor', moderate:'Moderate', severe:'Severe' });

function useCompletion(onComplete) {
  const finished = useRef(false);
  const current = useRef(onComplete);
  current.current = onComplete;
  return () => {
    if (finished.current) return;
    finished.current = true;
    current.current();
  };
}

function useReducedMotion() {
  const [reduced,setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    setReduced(media.matches);
    const update = () => setReduced(media.matches);
    media.addEventListener?.('change',update);
    return () => media.removeEventListener?.('change',update);
  }, []);
  return reduced;
}

const SMOKE = Array.from({length:18},(_,index) => ({
  index,
  x: `${((index*37+17)%115)-7}%`,
  y: `${((index*29+41)%110)-5}%`,
  delay: `${(index%6)*-0.18}s`,
  scale: (0.7+(index%5)*0.24).toFixed(2),
}));

function SmokeCurtain({ phase }) {
  return <div className="smp-cine__smoke" data-smoke-phase={phase} aria-hidden="true">
    {SMOKE.map(cloud => <i key={cloud.index} className="smp-cine__cloud"
      style={{'--cloud-x':cloud.x,'--cloud-y':cloud.y,'--cloud-scale':cloud.scale,'--cloud-delay':cloud.delay}}/>)}
  </div>;
}

export function LaunchCinematic({ ship, destination, onComplete }) {
  const phases = launchPhases(destination);
  const [phase,setPhase] = useState('flight');
  const finish = useCompletion(onComplete);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { finish(); return; }
    const a = setTimeout(() => setPhase('smoke'), CINEMATIC_DURATIONS.launchFlight);
    const b = setTimeout(() => setPhase('landing'), CINEMATIC_DURATIONS.launchFlight + CINEMATIC_DURATIONS.launchSmoke);
    const c = setTimeout(finish, CINEMATIC_DURATIONS.launchFlight + CINEMATIC_DURATIONS.launchSmoke + CINEMATIC_DURATIONS.launchLanding);
    return () => { clearTimeout(a);clearTimeout(b);clearTimeout(c); };
  }, [reduced]);
  const current = phases.find(item => item.phase === phase) || phases[0];
  return <section className="smp-cine smp-cine--launch" data-phase={phase}
    data-destination={destination} role="dialog" aria-modal="true" aria-label="Spacecraft launch and landing">
    <div className="smp-cine__stars" aria-hidden="true"/>
    <div className="smp-cine__surface" style={{'--cinematic-art':`url('/art/${destination}-landscape.svg')`}} aria-hidden="true"/>
    <div className={`smp-cine__target smp-cine__target--${destination}`} aria-hidden="true"/>
    <figure className="smp-cine__flight-ship"><img src={`/art/ship-${ship}-sealed.svg`} alt=""/></figure>
    <div className="smp-cine__exhaust" aria-hidden="true"/>
    <SmokeCurtain phase={phase}/>
    <div className="smp-cine__label" role="status" aria-live="polite">
      <small>MISSION LAUNCH</small><strong>{current.caption}</strong>
    </div>
    <button className="smp-cine__skip" type="button" onClick={finish}>Skip animation</button>
  </section>;
}

export function DayPassage({ ship, destination, day, forecastLevel, min, max, onComplete }) {
  const motion = forecastMotion(forecastLevel, min, max);
  const finish = useCompletion(onComplete);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) { finish(); return; }
    const timer = setTimeout(finish, CINEMATIC_DURATIONS.dayTransition);
    return () => clearTimeout(timer);
  }, [reduced]);
  return <main className="smp-cine smp-cine--day" data-weather={motion} data-destination={destination}
    aria-label={`Day ${day} simulation in progress`} style={{'--cinematic-art':`url('/art/${destination}-landscape.svg')`}}>
    <div className="smp-cine__day-landscape" aria-hidden="true"/>
    <div className="smp-cine__distant-storm" aria-hidden="true"/>
    <section className="smp-cine__day-log" role="status" aria-live="polite">
      <small>MISSION DAY {day}</small>
      <h1>Day in progress</h1>
      <p>Forecast: <strong>{STORM_NAMES[motion]}</strong></p>
      <p className="smp-cine__caption">This is a game forecast. The recorded storm level is revealed in the report.</p>
      <div className="smp-cine__loadbar" aria-hidden="true"><span/></div>
    </section>
    <figure className="smp-cine__day-ship"><img src={`/art/ship-${ship}-sealed.svg`} alt="" /></figure>
    <div className="smp-cine__storm-dust" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
    <button className="smp-cine__skip" type="button" onClick={finish}>Skip animation</button>
  </main>;
}

/** Reusable ship landscape for a continuous planning→report transition. */
export function ReportShipStage({ ship, destination }) {
  return <section className="smp-report-ship" aria-label={`${cinematicDestination(destination)} outpost after today's work`}>
    <figure><img src={`/art/ship-${ship}-sealed.svg`} alt={`${ship} spacecraft landed on ${cinematicDestination(destination)}`}/></figure>
  </section>;
}

/** The final visual is symbolic: a resource-management failure is NOT historical wreckage. */
export function EndingShipStage({ ship, status }) {
  const won = status === 'succeeded';
  return <section className="smp-ending-scene" data-ending={won?'return':'wreckage'} aria-label={won?'Spacecraft flying home toward Earth':'Illustrated spacecraft fragments drifting in space'}>
    <div className="smp-ending-scene__starfield" aria-hidden="true" />
    {won ? <>
      <div className="smp-ending-scene__earth" aria-hidden="true"/>
      <figure className="smp-ending-scene__return-ship"><img src={`/art/ship-${ship}-sealed.svg`} alt=""/></figure>
      <div className="smp-ending-scene__approach" aria-hidden="true"/>
    </> : <>
      <div className="smp-ending-scene__wreck smp-ending-scene__wreck--front"><img src={`/art/ship-${ship}-sealed.svg`} alt=""/></div>
      <div className="smp-ending-scene__wreck smp-ending-scene__wreck--back"><img src={`/art/ship-${ship}-sealed.svg`} alt=""/></div>
      <div className="smp-ending-scene__debris" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div>
      <p className="smp-ending-scene__clarifier">Illustrated game ending, not a real NASA incident.</p>
    </>}
  </section>;
}

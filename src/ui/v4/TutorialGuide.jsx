import { useEffect, useRef, useState } from 'react';
import { TUTORIAL_STEPS } from './tutorialGuide.js';
import './tutorial-guide.css';

const STAGE_LABELS = {
  menu: 'GETTING STARTED', preparation: 'PACK YOUR SHIP', assembly: 'YOUR CREW',
  play: 'MISSION CONTROL', report: 'DAILY REPORT', debrief: 'YOUR RESULTS', collection: 'SCIENCE ARCHIVE',
};

function findAnchorRect(anchor) {
  if (typeof document === 'undefined' || !anchor) return null;
  const element = document.querySelector(`[data-guide-anchor="${anchor}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4 || rect.bottom < 0 || rect.top > window.innerHeight) return null;
  const margin = 7;
  const left = Math.max(8, rect.left - margin);
  const top = Math.max(8, rect.top - margin);
  return {
    left: `${left}px`, top: `${top}px`,
    width: `${Math.max(0, Math.min(window.innerWidth - left - 8, rect.width + margin * 2))}px`,
    height: `${Math.max(0, Math.min(window.innerHeight - top - 8, rect.height + margin * 2))}px`,
  };
}

export function TutorialGuide({ stage, stepIndex, onStep, onClose, onSkipAll, styleName = 'classic' }) {
  const steps = TUTORIAL_STEPS[stage] || [];
  const step = steps[Math.min(Math.max(stepIndex, 0), steps.length - 1)];
  const [spotlight, setSpotlight] = useState(null);
  const firstButtonRef = useRef(null);
  useEffect(() => {
    firstButtonRef.current?.focus();
  }, [stage]);
  useEffect(() => {
    const update = () => setSpotlight(findAnchorRect(step?.anchor));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [stage, step?.anchor, stepIndex]);
  useEffect(() => {
    const keyHandler = event => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [onClose]);
  if (!step) return null;
  const last = stepIndex >= steps.length - 1;
  return <div className="astro-guide" data-menu-style={styleName} data-guide-stage={stage}>
    {spotlight && <div className="astro-guide__spotlight" style={spotlight} aria-hidden="true"/>}
    <aside className="astro-guide__panel" role="dialog" aria-modal="false" aria-label="AstroQuest tutorial" aria-describedby="astro-guide-text">
      <div className="astro-guide__topline"><span>✦ ASTROQUEST GUIDE</span><button ref={firstButtonRef} type="button" className="astro-guide__close" onClick={onClose} aria-label="Close tutorial">✕</button></div>
      <p className="astro-guide__chapter">{STAGE_LABELS[stage] || 'HOW TO PLAY'} · {stepIndex + 1} OF {steps.length}</p>
      <h2>{step.title}</h2>
      <p id="astro-guide-text" className="astro-guide__lesson" aria-live="polite">{step.text}</p>
      <div className="astro-guide__progress" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i <= stepIndex ? 'is-active' : ''}/>)}</div>
      <div className="astro-guide__actions">
        <button type="button" className="astro-guide__secondary" disabled={stepIndex === 0} onClick={() => onStep(stepIndex - 1)}>Back</button>
        <button type="button" className="astro-guide__next" onClick={last ? onClose : () => onStep(stepIndex + 1)}>{last ? 'Got it!' : 'Next tip →'}</button>
      </div>
      <button type="button" className="astro-guide__skip" onClick={onSkipAll}>Skip automatic tips</button>
    </aside>
  </div>;
}

export function TutorialHelpButton({ onClick, stage }) {
  return <button className="astro-guide__help" data-guide-screen={stage} type="button" onClick={onClick} aria-label="Open AstroQuest tutorial for this screen">
    <span aria-hidden="true">?</span> How to play
  </button>;
}

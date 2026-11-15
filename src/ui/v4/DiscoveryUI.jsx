import { useEffect, useRef, useState } from 'react';
import discoveryCatalog from '../../data/discoveries.js';
import { discoveryPresentation } from '../../logic/v4/discoveries.js';
import './discovery-ui.css';

function DiscoveryPhoto({ image }) {
  const localUrl = `/art/discoveries/${image.filename}`;
  const [src, setSrc] = useState(localUrl);
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="science-find__no-image" role="img" aria-label="Photo unavailable">✧</div>;
  return <img className="science-find__photo" src={src} alt={image.alt} loading="lazy" decoding="async"
    onError={() => {
      if (src === localUrl) setSrc(image.url);
      else setFailed(true);
    }} />;
}

function DisplayDiscovery({ id, index, compact = false }) {
  const entry = discoveryCatalog.find(item => item.id === id);
  const display = discoveryPresentation(entry, index);
  if (!display) return null;
  return <article className={`science-find ${compact ? 'science-find--compact' : ''}`}>
    {display.image ? <figure className="science-find__figure">
      <DiscoveryPhoto image={display.image}/>
      <figcaption>{display.image.credit.startsWith('Image courtesy') ? display.image.credit : `Photo: ${display.image.credit}`}</figcaption>
    </figure> : <span className="science-find__symbol" aria-hidden="true">✧</span>}
    <div className="science-find__copy">
      <div className="science-find__overline">SPACE BIOLOGY · {display.studyId}</div>
      <h3>{display.title}</h3>
      <p className="science-find__lesson"><strong>What we learned:</strong> {display.description}</p>
    </div>
  </article>;
}

export function DiscoveryPopup({ id, points, onClose, uiStyle = 'classic' }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    function handleKeys(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled])')];
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKeys);
    return () => { document.removeEventListener('keydown', handleKeys); previousFocus?.focus?.(); };
  }, [onClose]);
  return <div className="science-popup__veil" data-menu-style={uiStyle}>
    <section ref={dialogRef} className="science-popup" role="dialog" aria-modal="true"
      aria-labelledby="science-popup-title" aria-describedby="science-popup-description">
      <span className="science-popup__spark" aria-hidden="true">✦</span>
      <p className="science-popup__eyebrow">SCIENCE LAB BREAKTHROUGH!</p>
      <h2 id="science-popup-title">New discovery unlocked!</h2>
      <p id="science-popup-description">Your Science Lab specialist unlocked a space science lesson and earned extra research!</p>
      <div className="science-popup__points">+{points} Research <span aria-hidden="true">✦</span></div>
      <DisplayDiscovery id={id} compact />
      <button type="button" className="science-popup__confirm" autoFocus onClick={onClose}>
        Continue mission
      </button>
    </section>
  </div>;
}

export function DiscoveryCollection({ ids, title, subtitle, onBack, onReset, headerAction, styleName }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return <main className="science-collection" data-menu-style={styleName}>
    {headerAction}
    <div className="science-collection__stars" aria-hidden="true"/>
    <section className="science-collection__content" data-guide-anchor="collection">
      <button type="button" className="science-collection__back" onClick={onBack}>← Back</button>
      <p className="science-collection__eyebrow">MISSION SCIENCE ARCHIVE</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <div className="science-collection__count" aria-label={`${ids.length} out of ${discoveryCatalog.length} studies found`}>
        <strong>{ids.length}</strong> / {discoveryCatalog.length} studies found
      </div>
      {onReset && <div className="science-collection__reset" aria-live="polite">
        {!confirmReset ? <button type="button" className="science-collection__reset-btn"
          onClick={() => setConfirmReset(true)} disabled={ids.length === 0}>Reset discoveries</button>
        : <div className="science-collection__reset-confirm" role="group" aria-label="Confirm reset discoveries">
          <strong>Erase all saved discoveries on this device?</strong>
          <span>This does not reset your current mission or Research Points.</span>
          <button type="button" className="science-collection__reset-danger" onClick={() => { onReset(); setConfirmReset(false); }}>Yes, reset</button>
          <button type="button" className="science-collection__reset-cancel" onClick={() => setConfirmReset(false)}>Cancel</button>
        </div>}
      </div>}
      {ids.length === 0 ? <div className="science-collection__empty">
        <span aria-hidden="true">◇</span>
        <h2>No discoveries yet</h2>
        <p>Place the blue Science Lab specialist in the Science Lab. Give the room Energy and complete mission days.</p>
      </div> : <div className="science-collection__grid">
        {ids.map((id,index)=><DisplayDiscovery key={id} id={id} index={discoveryCatalog.findIndex(item=>item.id===id)}/>)}</div>}
      <p className="science-collection__disclaimer">NASA OSDR is an archived research collection. This game's discoveries and Research bonuses are simulated, not new NASA findings. Photos illustrate related research and may show other experiments.</p>
    </section>
  </main>;
}

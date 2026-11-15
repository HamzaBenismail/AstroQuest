import './title-screen.css';

/** First-load welcome screen. It does not mount or advance the mission. */
export default function TitleScreen({ onStart }) {
  return (
    <main className="aq-title-screen" aria-labelledby="aq-title-screen__name">
      <div className="aq-title-screen__universe" aria-hidden="true">
        <div className="aq-title-screen__stars aq-title-screen__stars--far"/>
        <div className="aq-title-screen__stars aq-title-screen__stars--near"/>
        <div className="aq-title-screen__nebula"/>
        <div className="aq-title-screen__planet aq-title-screen__planet--earth"/>
        <div className="aq-title-screen__planet aq-title-screen__planet--mars"/>
        <div className="aq-title-screen__planet aq-title-screen__planet--ringed">
          <div className="aq-title-screen__ring"/>
        </div>
        <div className="aq-title-screen__horizon"/>
      </div>

      <div className="aq-title-screen__hero">
        <div className="aq-title-screen__brand">
          <p className="aq-title-screen__eyebrow">JUNIOR ASTRONAUT MISSION TRAINER</p>
          <h1 id="aq-title-screen__name" className="aq-title-screen__logo">Astro<span>Quest</span></h1>
          <p className="aq-title-screen__subtitle">Your adventure beyond Earth begins here.</p>
        </div>
        <div className="aq-title-screen__flight" aria-hidden="true">
          <span className="aq-title-screen__engine-glow"/>
          <span className="aq-title-screen__motion-trail"/>
          <img src="/art/ship-explorer-sealed.svg" alt="" draggable="false"/>
        </div>
      </div>

      <button className="aq-title-screen__start" type="button" onClick={onStart}>
        Start <span aria-hidden="true">→</span>
      </button>
    </main>
  );
}

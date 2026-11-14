import { glossary } from './glossary.js'
import { TermHint } from './TermHint.jsx'

// F1: a 30-second briefing a 7-12 year old can understand without help. Short sentences
// (<=15 words, §7.4).
export function BriefingScreen({ config, onStart, onOpenDataSources }) {
  return (
    <section className="briefing-screen">
      <h1>Junior Astronaut Mission Trainer</h1>
      <p>You command a Moon outpost for {config.missionLengthDays} days.</p>
      <p>Each day you split your power between four things:</p>
      <ul>
        <li>
          <TermHint term={glossary.lifeSupport}>Life support</TermHint> — keeps the crew's air flowing.
        </li>
        <li>
          <TermHint term={glossary.shielding}>Shield</TermHint> — protects the crew from radiation storms.
        </li>
        <li>
          <TermHint term={glossary.greenhouse}>Greenhouse</TermHint> — grows food for tomorrow.
        </li>
        <li>
          <TermHint term={glossary.science}>Science</TermHint> — earns your mission score.
        </li>
      </ul>
      <p>Space weather is unpredictable. The forecast can be wrong. Choose wisely.</p>
      <p>Nothing is free — power spent on one thing is power you don't have for another.</p>
      <button type="button" className="primary-button" onClick={onStart} autoFocus>
        Start Mission
      </button>
      <button type="button" className="link-button" onClick={onOpenDataSources}>
        Data Sources
      </button>
    </section>
  )
}

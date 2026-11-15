import cards from '../data/cards.json';
import ScienceCard from './ScienceCard.jsx';
import { chooseScienceCard } from './science-content.js';
import Meters from './Meters.jsx';
import { STORM_LABELS } from './DayScreen.jsx';

export default function DayResult({ config, reveal, onContinue }) {
  const finished = reveal.status !== 'running';
  return (
    <section className="panel result" aria-labelledby="result-heading">
      <p className="eyebrow">Day {reveal.day} complete · Mission report</p>
      <h1 id="result-heading">Here is what happened.</h1>
      <p>Forecast: <strong>{STORM_LABELS[reveal.forecast]}</strong></p>
      <p>Actual game storm level: <strong>{STORM_LABELS[reveal.actual]}</strong></p>
      <p className="note">Real events use archived NASA DONKI records. Severity is a game simplification.</p>
      {reveal.events.length > 0 ? (
        <div className="event-box">
          <h2>Archived events</h2>
          <ul>{reveal.events.map((event, i) => <li key={`${event.sourceId}-${i}`}>
            {event.label} <span className="note">({event.type}; NASA record: {event.sourceId})</span>
          </li>)}</ul>
        </div>
      ) : <p className="note">No archived events for this day in the selected dataset.</p>}
      <Meters values={reveal.meters} config={config}/>
      <ScienceCard card={chooseScienceCard(cards, {stage:'report', level:reveal.actual, greenhouse:null, meters:reveal.meters, lowMeter:config.successMinMeter, severeLevel:config.stormLevelRange[1]})}/>
      <button className="primary" type="button" onClick={onContinue}>
        {finished ? 'See mission debrief' : 'Plan the next day'}
      </button>
    </section>
  );
}

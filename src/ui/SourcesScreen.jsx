import sources from '../data/sources.json';
import cards from '../data/cards.json';
import facts from '../data/facts.json';
import { verifiedCards, verifiedFacts } from './science-content.js';
import './science.css';

export const CCMC_ACKNOWLEDGEMENT = 'We acknowledge the Community Coordinated Modeling Center (CCMC) at Goddard Space Flight Center for the use of DONKI.';

export default function SourcesScreen({ onClose }) {
  const reviewed = verifiedCards(cards);
  const sourceFacts = verifiedFacts(facts);
  return <main className="sources-screen" aria-label="Data Sources">
    <article className="sources-screen__panel">
      <header className="sources-screen__header">
        <div><p className="science-card__eyebrow">Mission data and learning material</p><h1>Data Sources</h1></div>
        <button type="button" onClick={onClose} autoFocus>Back to mission</button>
      </header>
      <p>The game uses <strong>archived NASA data</strong>, not a live API connection.</p>
      <p>Air, Supplies, Safety, Energy, research rewards, and storm severity are <strong>simplified game units</strong>, not measured lunar conditions.</p>
      <p>NASA DONKI events are research/prototyping-quality records, not a forecast for an actual mission.</p>
      <div className="sources-screen__table-wrap">
        <table><thead><tr><th>Source</th><th>Role</th><th>Use</th></tr></thead>
          <tbody>{sources.map(source => <tr key={source.id}>
            <td><a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a></td>
            <td>{source.role}</td><td>{source.status}</td>
          </tr>)}</tbody></table>
      </div>
      <h2>Verified learning content</h2>
      {reviewed.length ? <ul>{reviewed.map(card => <li key={card.id}><a href={card.source.url} target="_blank" rel="noopener noreferrer">{card.source.studyId}</a>: {card.title}</li>)}</ul>
        : <p>No learning cards have passed the team's human-source verification gate yet.</p>}
      {sourceFacts.length > 0 && <p>{sourceFacts.length} verified NASA fact references are also available in the game.</p>}
      <h2>CCMC acknowledgement</h2>
      <p>{CCMC_ACKNOWLEDGEMENT} <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener noreferrer">DONKI tool</a>.</p>
      <p className="science-card__note"><a href="https://ccmc.gsfc.nasa.gov/publication-policy/" target="_blank" rel="noopener noreferrer">CCMC publication policy</a></p>
      <h2>Independence notice</h2>
      <p>This is an independent educational project. NASA does not endorse this game.</p>
      <button type="button" onClick={onClose}>Back to mission</button>
    </article>
  </main>;
}

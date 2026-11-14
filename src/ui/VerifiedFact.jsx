import facts from '../data/facts.json';
import { verifiedFacts } from './science-content.js';
import { IconCheck } from './icons.jsx';

/**
 * One checked NASA fact, shown beside the game rule it explains. Renders nothing
 * until the fact passes the team's human verification gate — an unverified fact
 * is never shown next to a game number.
 */
export default function VerifiedFact({ factId }) {
  const fact = verifiedFacts(facts).find(item => item.id === factId);
  if (!fact) return null;
  return (
    <p className="verified-fact">
      <span className="science-card__eyebrow"><IconCheck size={13}/> In real life</span>
      <br/>
      {fact.text}{' '}
      <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer">NASA source</a>
    </p>
  );
}

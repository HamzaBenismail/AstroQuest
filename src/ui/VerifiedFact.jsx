import facts from '../data/facts.json';
import { verifiedFacts } from './science-content.js';

export default function VerifiedFact({ factId }) {
  const fact = verifiedFacts(facts).find(item => item.id === factId);
  if (!fact) return null;
  return <p className="verified-fact">
    {fact.text}{' '}
    <a href={fact.sourceUrl} target="_blank" rel="noopener noreferrer">NASA source</a>
  </p>;
}

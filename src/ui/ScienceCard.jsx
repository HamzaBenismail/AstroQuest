import { verifiedCards } from './science-content.js';
import './science.css';

export default function ScienceCard({ card }) {
  if (!card || !verifiedCards([card]).length) return null;
  return <aside className="science-card" aria-label="Real NASA Science">
    <p className="science-card__eyebrow">Real NASA Science</p>
    <h2>{card.title}</h2>
    <p>{card.text}</p>
    <p className="science-card__source">NASA OSDR study <a href={card.source.url} target="_blank" rel="noopener noreferrer">{card.source.studyId}</a></p>
    <p className="science-card__note">The research describes its actual study subjects. It is not a measurement of this game’s Moon base.</p>
  </aside>;
}

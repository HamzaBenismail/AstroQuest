import { verifiedCards } from './science-content.js';
import { IconCheck, IconClock } from './icons.jsx';
import './science.css';

/**
 * Real NASA material only. A card reaches a player once a human on the team has
 * opened the study and confirmed the summary against it (`verified: true` in
 * src/data/cards.json). Until then the slot explains itself instead of
 * disappearing, so the layout is honest about what is still being checked and
 * nobody is tempted to fill the hole with an unverified claim.
 */
export default function ScienceCard({ card }) {
  if (!card || !verifiedCards([card]).length) {
    return (
      <aside className="science-card science-card--pending" aria-label="Real NASA science, pending review">
        <p className="science-card__eyebrow"><IconClock size={13}/> Real NASA science · in review</p>
        <p>
          A study from NASA's Open Science Data Repository belongs here. It appears once a team member
          has opened the source and checked this summary against it.
        </p>
        <p className="science-card__note">No unverified claim is ever shown to a player.</p>
      </aside>
    );
  }
  return (
    <aside className="science-card" aria-label="Real NASA science">
      <p className="science-card__eyebrow"><IconCheck size={13}/> Real NASA science</p>
      <h2>{card.title}</h2>
      <p>{card.text}</p>
      <p className="science-card__source">
        NASA OSDR study{' '}
        <a href={card.source.url} target="_blank" rel="noopener noreferrer">{card.source.studyId}</a>
      </p>
      <p className="science-card__note">
        The research describes its actual study subjects. It is not a measurement of this game's Moon base.
      </p>
    </aside>
  );
}

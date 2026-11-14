// Renders one "Real NASA Science" card (F6). It assumes the card is already verified —
// gating is pickCard's job (§6.6) — but defends anyway: an unverified card renders nothing.
export function ScienceCard({ card }) {
  if (!card || card.verified !== true) return null

  const { title, text, source } = card
  return (
    <aside className="science-card" aria-label="Real NASA Science">
      <p className="science-card-tag">Real NASA Science</p>
      <h3 className="science-card-title">{title}</h3>
      <p className="science-card-text">{text}</p>
      {source?.url && (
        <p className="science-card-source">
          Source:{' '}
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            NASA OSDR study {source.studyId}
          </a>
        </p>
      )}
    </aside>
  )
}

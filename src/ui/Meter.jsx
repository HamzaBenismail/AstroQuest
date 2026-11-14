// Never color-only (§7.4): the numeric value is always shown alongside the bar.
export function Meter({ icon, label, value, max }) {
  const percent = Math.round((value / max) * 100)
  const low = value <= max * 0.3
  return (
    <div className="meter" aria-label={`${label}: ${value} of ${max}`}>
      <span className="meter-label">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <div className="meter-bar-track">
        <div
          className={`meter-bar-fill${low ? ' meter-bar-fill-low' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="meter-value">
        {value} / {max}
      </span>
    </div>
  )
}

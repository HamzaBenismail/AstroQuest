const METERS = [
  { key: 'air', icon: '◉', label: 'Air' },
  { key: 'food', icon: '▣', label: 'Food' },
  { key: 'safety', icon: '⬡', label: 'Crew Safety' },
];

export default function Meters({ values, config }) {
  return (
    <section className="panel" aria-labelledby="meters-title">
      <h2 id="meters-title">Crew resources</h2>
      <p className="note">Simplified game units, not real measurements.</p>
      <div className="meter-grid">
        {METERS.map(({ key, icon, label }) => (
          <div className="meter" key={key}>
            <div className="meter-head"><span aria-hidden="true">{icon}</span><strong>{label}</strong>
              <span>{values[key]} / {config.meterMax}</span></div>
            <progress aria-label={`${label} remaining`} value={values[key]}
              max={config.meterMax}>{values[key]}</progress>
          </div>
        ))}
      </div>
    </section>
  );
}

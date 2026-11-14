import dataSources from '../data/dataSources.json'

// F8 (§7.5): lists every dataset with its role and archived/live status, the
// non-endorsement note, and the official-forecast clarification. Content is read from
// src/data/dataSources.json so it stays data-driven, not hardcoded in JSX.
export function DataSourcesScreen({ onBack }) {
  return (
    <section className="data-sources-screen">
      <h2>Data Sources</h2>
      <p>{dataSources.intro}</p>

      <ul className="data-sources-list">
        {dataSources.sources.map((source) => (
          <li key={source.name} className="data-source">
            <h3>
              {source.name} <span className="data-source-full">({source.fullName})</span>
            </h3>
            <p className="data-source-role">{source.role}</p>
            <p className={`data-source-status data-source-status-${source.status}`}>
              <strong>{source.statusLabel}</strong>
            </p>
            {source.url && (
              <p className="data-source-link">
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.url}
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className="data-sources-note">{dataSources.officialForecastNote}</p>
      <p className="data-sources-ack">{dataSources.ccmcAcknowledgement}</p>
      <p className="data-sources-note">{dataSources.nonEndorsement}</p>

      <button type="button" className="primary-button" onClick={onBack} autoFocus>
        Back
      </button>
    </section>
  )
}

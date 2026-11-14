import { getDayBudget, validateAllocation } from '../logic/index.js'
import { Meter } from './Meter.jsx'
import { AllocationControl } from './AllocationControl.jsx'
import { TermHint } from './TermHint.jsx'
import { glossary } from './glossary.js'
import { stormLevelLabel } from './stormLevelLabel.js'

const CONSUMERS = [
  { key: 'lifeSupport', label: 'Life Support', hint: glossary.lifeSupport },
  { key: 'shield', label: 'Shield', hint: glossary.shielding },
  { key: 'greenhouse', label: 'Greenhouse', hint: glossary.greenhouse },
  { key: 'science', label: 'Science', hint: glossary.science },
]

export function DayScreen({ config, uiState, dispatch }) {
  const { gameState, forecasts, allocation, awaitingAdvance, revealResult } = uiState

  if (awaitingAdvance && revealResult) {
    return (
      <RevealPanel
        revealResult={revealResult}
        meterMax={config.meterMax}
        onAdvance={() => dispatch({ type: 'ADVANCE' })}
      />
    )
  }

  const day = gameState.day
  const budget = getDayBudget(day, config)
  const total = CONSUMERS.reduce((sum, c) => sum + allocation[c.key], 0)
  const check = validateAllocation(allocation, day, config)
  const forecast = forecasts[day - 1]

  return (
    <section className="day-screen">
      <h2>
        Day {day} of {config.missionLengthDays}
      </h2>

      <div className="meters">
        <Meter icon="💨" label="Air" value={gameState.meters.air} max={config.meterMax} />
        <Meter icon="🍽️" label="Food" value={gameState.meters.food} max={config.meterMax} />
        <Meter icon="🛡️" label="Crew Safety" value={gameState.meters.safety} max={config.meterMax} />
      </div>

      <p className="forecast">
        Space weather forecast: <strong>{stormLevelLabel(forecast)}</strong>.{' '}
        <TermHint term="The forecast can be off by one level — the real level is revealed after you choose.">
          Forecasts aren't always right.
        </TermHint>
      </p>

      <div className="allocation-controls">
        {CONSUMERS.map((c) => {
          const [min, max] = config.allocationRanges[c.key]
          return (
            <AllocationControl
              key={c.key}
              label={c.label}
              hint={<TermHint term={c.hint}>?</TermHint>}
              value={allocation[c.key]}
              min={min}
              max={max}
              canIncrementBudget={total < budget}
              onChange={(value) => dispatch({ type: 'SET_ALLOCATION', key: c.key, value })}
            />
          )
        })}
      </div>

      <p className="budget-readout" aria-live="polite">
        Power used: {total} / {budget}
      </p>

      <button
        type="button"
        className="primary-button"
        disabled={!check.ok}
        onClick={() => dispatch({ type: 'COMMIT' })}
      >
        Commit Day's Plan
      </button>
    </section>
  )
}

function RevealPanel({ revealResult, meterMax, onAdvance }) {
  const { day, level, events, meters } = revealResult
  return (
    <section className="reveal-panel">
      <h2>Day {day} Report</h2>
      <p>
        Real storm level: <strong>{stormLevelLabel(level)}</strong>
      </p>
      {events.length > 0 && (
        <div className="event-list">
          <p>
            <em>Real data: NASA DONKI (archived data)</em>
          </p>
          <ul>
            {events.map((event) => (
              <li key={event.sourceId}>{event.label}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="meters">
        <Meter icon="💨" label="Air" value={meters.air} max={meterMax} />
        <Meter icon="🍽️" label="Food" value={meters.food} max={meterMax} />
        <Meter icon="🛡️" label="Crew Safety" value={meters.safety} max={meterMax} />
      </div>
      <button type="button" className="primary-button" onClick={onAdvance} autoFocus>
        Continue
      </button>
    </section>
  )
}

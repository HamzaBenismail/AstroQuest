import { Meter } from './Meter.jsx'
import { describeOutcome } from './debriefText.js'

export function DebriefScreen({ config, debrief, onTryAgain }) {
  const { title, message } = describeOutcome(debrief, config)

  return (
    <section className="debrief-screen">
      <h2>{title}</h2>
      <p>{message}</p>

      <div className="meters">
        <Meter icon="💨" label="Air" value={debrief.meters.air} max={config.meterMax} />
        <Meter icon="🍽️" label="Food" value={debrief.meters.food} max={config.meterMax} />
        <Meter icon="🛡️" label="Crew Safety" value={debrief.meters.safety} max={config.meterMax} />
      </div>

      <p className="score-readout">
        Science score: <strong>{debrief.score}</strong>
      </p>
      <p>Days completed: {debrief.daysCompleted}</p>

      <button type="button" className="primary-button" onClick={onTryAgain} autoFocus>
        Try Again
      </button>
    </section>
  )
}

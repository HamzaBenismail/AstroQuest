import { buildDebrief } from '../logic/game.js';
import Meters from './Meters.jsx';

const REASONS = {
  air: 'The crew needed more air. Give life support more power next time.',
  food: 'Food ran out. Power the greenhouse earlier so food arrives tomorrow.',
  safety: 'The crew needed more protection. Save power for shielding.',
};

export default function DebriefScreen({ config, game, mission, onRestart }) {
  const report = buildDebrief(game, mission);
  return (
    <section className="panel debrief" aria-labelledby="debrief-title">
      <p className="eyebrow">Mission debrief</p>
      <h1 id="debrief-title">{report.status === 'succeeded' ? 'Mission complete!' : 'Mission ended early.'}</h1>
      <p>{report.status === 'succeeded'
        ? 'You kept your crew safe for the full mission.'
        : REASONS[report.reason] ?? 'Review your power choices and try again.'}</p>
      <p><strong>Days completed:</strong> {report.completedDays} / {config.missionLengthDays}</p>
      <p><strong>Science score:</strong> {report.score} game points</p>
      <Meters values={report.meters} config={config}/>
      <p className="note">Mission events: {report.dataSource}. This is not live data.</p>
      <button className="primary" type="button" onClick={onRestart}>Try again</button>
    </section>
  );
}

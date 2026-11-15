export default function BriefingScreen({ config, mission, onStart }) {
  return (
    <section className="panel briefing" aria-labelledby="briefing-title">
      <p className="eyebrow">AstroQuest · Mission briefing · Lunar outpost</p>
      <h1 id="briefing-title">Keep the crew safe.</h1>
      <p>Run your outpost for {config.missionLengthDays} days.</p>
      <p>Keep Air, Food, and Crew Safety above zero.</p>
      <p>Share a limited power supply between four rooms.</p>
      <p>The storm forecast may be wrong by one level.</p>
      <div className="tutorial" aria-label="How to play">
        <h2>How to play</h2>
        <ol>
          <li>Read the storm warning.</li>
          <li>Give power to the four rooms.</li>
          <li>Commit your plan and review what happened.</li>
          <li>Learn from each choice and survive all {config.missionLengthDays} days.</li>
        </ol>
      </div>
      <p className="note">Power and resources use simplified game units.</p>
      <p className="note">Events use {mission.dataSource}. This is not a live forecast.</p>
      <button className="primary" onClick={onStart}>Start mission</button>
    </section>
  );
}

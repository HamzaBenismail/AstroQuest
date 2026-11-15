import { CONSUMER_LABELS } from './session.js';

const DESCRIPTIONS = {
  lifeSupport: 'Helps keep air available.',
  shield: 'Protects the crew during storms.',
  greenhouse: 'Helps grow food for tomorrow.',
  science: 'Earns mission science points.',
};

export default function AllocationControls({ config, allocation, preview, onAllocate }) {
  return (
    <section className="panel" aria-labelledby="allocation-title">
      <h2 id="allocation-title">Choose room power</h2>
      <p className="note">Power not used today is lost.</p>
      <div className="allocations">
        {Object.entries(CONSUMER_LABELS).map(([name, label]) => {
          const [min, max] = config.allocationRanges[name];
          const value = allocation[name];
          return (
            <div className="allocation-row" key={name} id={`allocation-${name}`} tabIndex={-1}>
              <div className="allocation-description">
                <strong>{label}</strong>
                <span>{DESCRIPTIONS[name]}</span>
              </div>
              <div className="stepper" aria-label={`${label} power allocation`}>
                <button type="button" aria-label={`Decrease ${label} power`}
                  onClick={() => onAllocate(name, -1)} disabled={value <= min}>−</button>
                <output aria-label={`${label} units`}>{value}</output>
                <button type="button" aria-label={`Increase ${label} power`}
                  onClick={() => onAllocate(name, 1)}
                  disabled={value >= max || preview.remaining <= 0}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="budget-summary" role="status">
        <span>Power used: <strong>{preview.total} / {preview.budget}</strong></span>
        <span>Available: <strong>{preview.remaining}</strong></span>
      </div>
    </section>
  );
}

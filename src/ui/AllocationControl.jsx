// Large, keyboard-operable +/- buttons with aria-labels (§7.4 — icon-only controls need one).
// `canIncrementBudget` is computed by the parent, which knows the full allocation and the
// day's budget — this component only enforces its own min/max range.
export function AllocationControl({ label, hint, value, min, max, canIncrementBudget, onChange }) {
  const canIncrement = value < max && canIncrementBudget
  const canDecrement = value > min

  return (
    <div className="allocation-control">
      <div className="allocation-control-label">
        {label}
        {hint}
      </div>
      <div className="allocation-control-stepper">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(value - 1)}
          disabled={!canDecrement}
        >
          −
        </button>
        <span className="allocation-control-value" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(value + 1)}
          disabled={!canIncrement}
        >
          +
        </button>
      </div>
      <div className="allocation-control-range">
        ({min}–{max})
      </div>
    </div>
  )
}

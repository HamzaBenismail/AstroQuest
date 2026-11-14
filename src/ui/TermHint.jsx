// Native <details>/<summary> is keyboard-operable and accessible without extra JS (§7.4).
export function TermHint({ term, children }) {
  return (
    <details className="term-hint">
      <summary>{children}</summary>
      <p>{term}</p>
    </details>
  )
}

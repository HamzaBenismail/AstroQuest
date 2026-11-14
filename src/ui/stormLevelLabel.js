// §16 glossary: 0 none, 1 minor, 2 moderate, 3 severe — our own game simplification,
// not a NASA-defined scale.
const LABELS = ['None', 'Minor', 'Moderate', 'Severe']

export function stormLevelLabel(level) {
  return LABELS[level] ?? 'Unknown'
}

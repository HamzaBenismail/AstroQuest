import VerifiedFact from './VerifiedFact.jsx';
// In-game rule explanations only. Scientific facts (dose, sol, physical radiation
// measurement) must wait for verified entries in src/data/facts.json (Phase 6).
export default function TermHelp() {
  return (
    <aside className="help panel" aria-labelledby="help-title">
      <h2 id="help-title">What do these words mean?</h2>
      <p><strong>Shielding:</strong> In this game, shield power protects Crew Safety from storm damage.</p>
      <p><strong>Forecast:</strong> The game's storm warning. The real game level may differ by one.</p>
      <VerifiedFact factId="fact-shielding"/>
      <VerifiedFact factId="fact-dose"/>
      <VerifiedFact factId="fact-sol"/>
      <p><strong>Game units:</strong> Simple values for practice, not real spacecraft measurements.</p>
    </aside>
  );
}

export default function DataGate({ issue }) {
  return (
    <main className="page">
      <section className="panel gate" aria-labelledby="gate-title">
        <p className="eyebrow">Mission data verification</p>
        <h1 id="gate-title">The mission is not ready yet.</h1>
        <p>{issue}</p>
        <p>Complete Phase 2 before playing with real archived NASA data.</p>
        <p className="note">No sample events are presented as real observations.</p>
      </section>
    </main>
  );
}

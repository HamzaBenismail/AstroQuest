import { IconHatch } from './icons.jsx';

/**
 * Shown instead of the game when no approved, archived mission file is present.
 * Written for a child as well as a reviewer: it says what is happening, why the
 * hatch is shut, and that no invented event is ever presented as a real one.
 */
export default function DataGate({ issue }) {
  return (
    <main className="page starfield">
      <section className="panel" aria-labelledby="gate-title">
        <span className="gate__icon"><IconHatch size={54} label="A closed hatch"/></span>
        <p className="eyebrow">Mission data verification</p>
        <h1 id="gate-title">The mission is not ready to fly yet.</h1>
        <p>
          Before anyone plays, a person on the team has to check the archived NASA records and approve
          how they turn into storm levels. That has not happened for this mission file.
        </p>
        <p className="notice notice--warn">
          <strong>What is missing:</strong> {issue}
        </p>
        <p className="note">
          No made-up events are ever shown as real observations. That is why you are seeing this screen
          instead of a demonstration mission.
        </p>
      </section>
    </main>
  );
}

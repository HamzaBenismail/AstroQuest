import sources from '../data/sources.json';
import cards from '../data/cards.json';
import facts from '../data/facts.json';
import { verifiedCards, verifiedFacts } from './science-content.js';
import { IconArrowLeft, IconCheck, IconInfo, IconWarning } from './icons.jsx';
import './science.css';

export const CCMC_ACKNOWLEDGEMENT = 'We acknowledge the Community Coordinated Modeling Center (CCMC) at Goddard Space Flight Center for the use of DONKI.';

/**
 * Two reading levels on one screen: a plain-language "really happened versus
 * made for the game" split a child can follow, then the full source table a
 * teacher or reviewer needs. Everything links back to its origin.
 */
export default function SourcesScreen({ onClose }) {
  const reviewed = verifiedCards(cards);
  const sourceFacts = verifiedFacts(facts);
  return (
    <main className="sources-screen" aria-label="Where our data comes from">
      <article className="sources-screen__panel">
        <header className="sources-screen__header">
          <div>
            <p className="science-card__eyebrow" style={{ color: 'var(--ink-4)' }}>
              Mission data and learning material
            </p>
            <h1>Where our data comes from</h1>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose} autoFocus>
            <IconArrowLeft size={17}/>Back to the mission
          </button>
        </header>

        <p className="sources-screen__lede">
          Some things in this game are real NASA records. Other things are numbers we made up so the
          game is fun and fair. Here is exactly which is which.
        </p>

        <section aria-labelledby="src-split">
          <h2 id="src-split">The simple version</h2>
          <div className="sources-screen__split">
            <div className="sources-screen__col sources-screen__col--real">
              <h3><IconCheck size={24}/>Really happened</h3>
              <ul>
                <li>The solar flares and storms in your mission are <strong>archived NASA records</strong> from real dates.</li>
                <li>Every "Real NASA science" card points to a <strong>published study</strong> you can open and read.</li>
                <li>Facts about lunar day length, shielding and radio delay come from <strong>NASA pages</strong>.</li>
              </ul>
            </div>
            <div className="sources-screen__col sources-screen__col--game">
              <h3><IconInfo size={24}/>Made for the game</h3>
              <ul>
                <li>Air, Supplies, Crew Safety and Energy are <strong>simple numbers out of 10</strong>, not real measurements.</li>
                <li>Storm levels 0 to 3 are a <strong>game scale</strong>. They are not a radiation dose in mSv or Gy.</li>
                <li>Upgrade costs, EVA rewards and the reply delay are <strong>balance choices</strong> made by the team.</li>
              </ul>
            </div>
          </div>
          <p className="notice notice--warn">
            <IconWarning size={18}/>
            <span>
              This game uses data NASA stored earlier — it is not connected live to any NASA service while
              you play, and nothing here is a forecast for a real mission.
            </span>
          </p>
        </section>

        <section aria-labelledby="src-table">
          <h2 id="src-table">Every source we use</h2>
          <div className="sources-screen__table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">What it gives the game</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(source => (
                  <tr key={source.id}>
                    <td>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}</a>
                    </td>
                    <td>{source.role}</td>
                    <td><span className="chip">{source.status}</span></td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Game balance tables</strong><small>This project's own config</small></td>
                  <td>Meter sizes, energy budgets, upgrade costs, EVA rewards and forecast error.</td>
                  <td><span className="chip">Game units</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="sources-screen__cards">
          <section className="sources-screen__block" aria-labelledby="src-cards">
            <h2 id="src-cards">Science cards in the game</h2>
            <p>
              A card only appears once a human on the team has opened the study and checked that the
              summary matches it.
            </p>
            {reviewed.length ? (
              <ul>
                {reviewed.map(card => (
                  <li key={card.id}>
                    <a href={card.source.url} target="_blank" rel="noopener noreferrer">{card.source.studyId}</a>
                    <span>{card.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sources-screen__quote">
                No learning card has passed that check yet, so the game is not showing any. The slots stay
                visible and empty rather than being filled with an unverified summary.
              </p>
            )}
            {sourceFacts.length > 0 && (
              <p>{sourceFacts.length} verified NASA fact reference{sourceFacts.length === 1 ? '' : 's'} are also shown in the game.</p>
            )}
          </section>

          <section className="sources-screen__block" aria-labelledby="src-credit">
            <h2 id="src-credit">Credit &amp; independence</h2>
            <p>
              {CCMC_ACKNOWLEDGEMENT}{' '}
              <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener noreferrer">DONKI tool</a>
              {' · '}
              <a href="https://ccmc.gsfc.nasa.gov/publication-policy/" target="_blank" rel="noopener noreferrer">CCMC publication policy</a>
            </p>
            <p className="sources-screen__quote">
              <strong>This is an independent educational project.</strong> NASA does not endorse this game.
              The outpost schematic, the room names and all artwork were made for this project.
            </p>
            <p>
              It is a gameplay prototype, not a NASA-calibrated simulation. If you want the real numbers,
              follow the source links above — that is what they are for.
            </p>
          </section>
        </div>

        <footer>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <IconArrowLeft size={17}/>Back to the mission
          </button>
        </footer>
      </article>
    </main>
  );
}

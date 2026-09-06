import { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useExplorer } from '../store';
import { sources } from '../data/sources';
const steps = [
  {
    name: 'The client',
    title: 'A risk to place',
    text: 'Fictional client Harbour Studio wants to insure an exhibition travelling overseas. Its broker gathers the details.',
  },
  {
    name: 'The broker',
    title: 'Finding the right expertise',
    text: 'Fictional broker North Quay presents the risk to underwriters, who evaluate the cover and terms.',
  },
  {
    name: 'The underwriters',
    title: 'Sharing the risk',
    text: 'In this invented example, three syndicates participate: A takes 50%, B takes 30% and C takes 20%. These figures explain sharing, not pricing advice.',
  },
];
export function Market() {
  const step = useExplorer((s) => s.marketStep);
  const setStep = useExplorer((s) => s.setMarketStep);
  const [org, setOrg] = useState(false);
  return (
    <section className="market-panel" aria-label="Inside the market">
      <span className="eyebrow">PEOPLE, NOT JUST A PLACE</span>
      <h2>A meeting of expertise.</h2>
      <p className="market-intro">
        Lloyd’s is an insurance marketplace. This small, fictional example explains one way a risk
        can be placed.
      </p>
      <div className="market-tabs">
        <button aria-pressed={!org} className={!org ? 'active' : ''} onClick={() => setOrg(false)}>
          Placement journey
        </button>
        <button aria-pressed={org} className={org ? 'active' : ''} onClick={() => setOrg(true)}>
          Market structure
        </button>
      </div>
      {!org ? (
        <>
          <div className="journey">
            {steps.map((s, i) => (
              <button
                key={s.name}
                className={step === i ? 'active' : ''}
                onClick={() => setStep(i)}
              >
                <span>{i + 1}</span>
                {s.name}
                {i < 2 && <ArrowRight size={13} />}
              </button>
            ))}
          </div>
          <div className="journey-detail" aria-live="polite">
            <h3>{steps[step].title}</h3>
            <p>{steps[step].text}</p>
            {step === 2 && (
              <div className="syndicates">
                <span style={{ flex: 5 }}>A · 50%</span>
                <span style={{ flex: 3 }}>B · 30%</span>
                <span style={{ flex: 2 }}>C · 20%</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="organisation">
          <p>
            <strong>Members</strong> provide underwriting capital to syndicates.
          </p>
          <div className="org-link">capital ↓</div>
          <p>
            <strong>Syndicates</strong> bring together capital and accept insurance risks.
          </p>
          <div className="org-link">↑ managed by</div>
          <p>
            <strong>Managing agents</strong> run syndicates and employ underwriters.
          </p>
          <small>
            These are organisational relationships, not extra steps in the placement journey.
          </small>
        </div>
      )}
      <p className="accuracy-note">
        Fictional names and participation figures. No live activity or current desk allocations.
        Business can also reach Lloyd’s through other routes and does not have to be conducted
        physically here.
      </p>
      <a className="source-link" href={sources.market.url} target="_blank" rel="noreferrer">
        How the Lloyd’s market works
        <ArrowUpRight size={13} />
      </a>
    </section>
  );
}

import { Link } from "react-router-dom";

// PLACEHOLDER CONTENT — replace every section below with Kerala Paints'
// actual warranty terms once finalized. Structure follows what most paint
// manufacturers publish (coverage period by product line, conditions,
// exclusions, how to claim) but none of the specific numbers or wording
// here are real yet.

const COVERAGE = [
  { line: "Exterior Emulsions (All in One, Silver Ex, Gold Ex ranges)", years: "5–7 years", note: "against peeling, cracking, and fading under normal conditions" },
  { line: "Interior Emulsions (Silver In, Gold In ranges)", years: "2–4 years", note: "against peeling and cracking under normal indoor conditions" },
  { line: "Waterproofing (Aqua Seal, Tough Seal, Sealer Prime)", years: "5–10 years", note: "against leakage when applied per specification" },
  { line: "Primers, putty, and undercoats", years: "Not separately warrantied", note: "covered only as part of the full system warranty" },
];

const CONDITIONS = [
  "The product must be registered within 30 days of purchase using the original invoice.",
  "Application must follow the surface preparation and coating-system instructions on the product label.",
  "Warranty applies only to the original purchaser and the registered property address.",
  "Claims must include the warranty registration token generated at the time of registration.",
];

const EXCLUSIONS = [
  "Damage from structural movement, dampness from external sources, or pre-existing surface defects.",
  "Discoloration from environmental pollution, chemical exposure, or improper cleaning agents.",
  "Products applied by unregistered or unauthorized applicators, where applicable.",
  "Normal wear, minor color variation between batches, and cosmetic issues not affecting performance.",
];

export default function WarrantyPolicy() {
  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card policy-card">
          <span className="eyebrow">Kerala Paints · Warranty</span>
          <h1>General Warranty Policy</h1>
          <p className="policy-intro">
            This page summarizes the standard warranty terms across our product ranges. Exact
            duration and conditions vary by product — always check the label of the specific
            product you've purchased.
          </p>

          <div className="policy-note">
            Placeholder content — replace with Kerala Paints' finalized warranty terms.
          </div>

          <section className="policy-section">
            <h2>Coverage by product line</h2>
            <div className="coverage-table">
              {COVERAGE.map((row) => (
                <div className="coverage-row" key={row.line}>
                  <div className="coverage-line">{row.line}</div>
                  <div className="coverage-years">{row.years}</div>
                  <div className="coverage-note">{row.note}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="policy-section">
            <h2>Conditions for coverage</h2>
            <ul className="policy-list">
              {CONDITIONS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="policy-section">
            <h2>What's not covered</h2>
            <ul className="policy-list">
              {EXCLUSIONS.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>

          <section className="policy-section">
            <h2>How to make a claim</h2>
            <p className="policy-text">
              Register your purchase first, then use the Claim Warranty portal with your invoice
              number and registered contact number to file a claim against a specific product.
            </p>
          </section>

          <div className="policy-actions">
            <Link to="/warranty/register" className="btn btn-primary">
              Register a warranty
            </Link>
            <Link to="/claim" className="btn btn-ghost">
              Claim warranty
            </Link>
          </div>

          <Link to="/" className="back-link">
            ← Back to home
          </Link>
        </div>
      </div>
      <PolicyStyles />
    </div>
  );
}

function PolicyStyles() {
  return (
    <style>{`
      .page-shell { min-height: 100vh; padding: 56px 0 80px; display: flex; align-items: flex-start; justify-content: center; }
      .container.narrow { max-width: 720px; }
      .policy-card { padding: 40px 36px 36px; animation: rise 0.5s ease both; }
      @keyframes rise { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
      .policy-card h1 { font-size: 28px; margin-top: 6px; }
      .policy-intro { color: var(--ink-muted); margin-top: 10px; font-size: 14.5px; line-height: 1.6; }
      .policy-note {
        margin-top: 16px; background: #fdf0dd; color: #8a5a12; border-radius: 9px;
        padding: 10px 14px; font-size: 12.5px; font-weight: 600;
      }
      .policy-section { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); }
      .policy-section h2 { font-size: 15px; color: var(--navy-900); margin-bottom: 14px; }
      .policy-text { font-size: 14px; color: var(--ink); line-height: 1.6; }
      .coverage-table { display: flex; flex-direction: column; gap: 10px; }
      .coverage-row {
        background: rgba(15,138,128,0.05); border: 1px solid var(--line); border-radius: 9px;
        padding: 12px 14px;
      }
      .coverage-line { font-weight: 700; font-size: 13.5px; color: var(--navy-900); }
      .coverage-years { font-family: var(--font-mono); font-size: 12.5px; color: var(--teal-600); font-weight: 700; margin-top: 4px; }
      .coverage-note { font-size: 12.5px; color: var(--ink-muted); margin-top: 4px; }
      .policy-list { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
      .policy-list li { font-size: 13.5px; color: var(--ink); line-height: 1.55; }
      .policy-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 30px; }
      .back-link { display: inline-block; margin-top: 26px; font-size: 13.5px; color: var(--teal-600); font-weight: 600; text-decoration: none; }
      .back-link:hover { text-decoration: underline; }
      @media (max-width: 640px) {
        .policy-card { padding: 30px 22px 26px; }
        .page-shell { padding: 32px 0 60px; }
      }
    `}</style>
  );
}
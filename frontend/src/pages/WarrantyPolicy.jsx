import { Link } from "react-router-dom";

const TERMS = [
  "Warranty applies only to products carrying an expressly declared warranty and is subject to the Kerala Paints Master Warranty Policy and applicable Product-Specific Warranty Terms.",
  "The original purchase invoice must be retained throughout the warranty period.",
  <>
    Warranty must be registered at{" "}
    <a href="https://www.keralapaints.com" target="_blank" rel="noreferrer">
      www.keralapaints.com
    </a>{" "}
    → Warranty within 15 days of completion of paint application; otherwise, the voluntary
    warranty shall not apply.
  </>,
  "Tinted/colour-mixed paints must be applied within 15 days of the invoice date, failing which the voluntary performance warranty shall not apply.",
  "Before application, the customer/applicator must follow the product-specific surface preparation, mixing, dilution and application instructions available on the Kerala Paints website; non-compliance that causes or materially contributes to a failure may affect warranty coverage.",
];

export default function WarrantyPolicy() {
  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card policy-card">
          <span className="eyebrow">Kerala Paints · Warranty</span>
          <h1>General Warranty Policy</h1>
          <p className="policy-intro">
            The key terms below summarize what every warranty registration is subject to. For the
            complete Master Warranty Policy — including covered failures, exclusions, claim
            procedures, and product-specific conditions — download the full document.
          </p>

          <section className="policy-section" style={{ marginTop: 22, paddingTop: 0, borderTop: "none" }}>
            <h2>Warranty Terms</h2>
            <ul className="policy-list">
              {TERMS.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>

            
            <a
              href="/documents/WarrantyPolicyGeneral.pdf"
              download="WarrantyPolicyGeneral.pdf"
              className="btn btn-primary download-btn"
            >
              ⬇ Download Master Warranty Policy (PDF)
            </a>
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
      .policy-section { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); }
      .policy-section h2 { font-size: 15px; color: var(--navy-900); margin-bottom: 14px; }
      .policy-text { font-size: 14px; color: var(--ink); line-height: 1.6; }
      .policy-list { padding-left: 20px; display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px; }
      .policy-list li { font-size: 13.5px; color: var(--ink); line-height: 1.6; }
      .policy-list a { color: var(--teal-600); font-weight: 600; text-decoration: underline; }
      .download-btn { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
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
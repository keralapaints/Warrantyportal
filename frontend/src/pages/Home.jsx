import { Link } from "react-router-dom";

const SWATCHES = ["#0f8a80", "#2f6fed", "#d97a13", "#12946f", "#0b1f3a"];

const OPTIONS = [
  {
    to: "/warranty-policy",
    eyebrow: "Read first",
    title: "General Warranty Policy",
    blurb: "Coverage terms, duration by product, and what's included or excluded.",
  },
  {
    to: "/warranty/register",
    eyebrow: "New purchase",
    title: "Register Your Warranty",
    blurb: "Register your invoice within the coverage window to activate warranty support.",
  },
  {
    to: "/claim",
    eyebrow: "Already registered",
    title: "Claim Warranty",
    blurb: "File a claim against a product you've already registered.",
  },
];

export default function Home() {
  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card home-card">
          <div className="swatch-strip">
            {SWATCHES.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <span className="eyebrow">Kerala Paints</span>
          <h1>Warranty Desk</h1>
          <p className="home-intro">Choose what you'd like to do.</p>

          <div className="option-stack">
            {OPTIONS.map((opt) => (
              <Link to={opt.to} className="option-tile" key={opt.to}>
                <span className="option-eyebrow">{opt.eyebrow}</span>
                <span className="option-title">{opt.title}</span>
                <span className="option-blurb">{opt.blurb}</span>
                <span className="option-arrow">→</span>
              </Link>
            ))}
          </div>

          <div className="home-footer">
            <Link to="/track" className="track-link">
              Already filed a claim? Track its status
            </Link>
          </div>
        </div>
      </div>
      <HomeStyles />
    </div>
  );
}

function HomeStyles() {
  return (
    <style>{`
      .page-shell {
        min-height: 100vh;
        padding: 56px 0 80px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .container.narrow { max-width: 640px; }
      .home-card {
        padding: 40px 36px 36px;
        animation: rise 0.5s ease both;
      }
      @keyframes rise {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .swatch-strip { display: flex; gap: 6px; margin-bottom: 20px; }
      .swatch-strip span { width: 28px; height: 6px; border-radius: 3px; }
      .home-card h1 { font-size: 30px; margin-top: 6px; }
      .home-intro { color: var(--ink-muted); margin-top: 10px; font-size: 14.5px; }

      .option-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 28px;
      }
      .option-tile {
        position: relative;
        display: block;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        padding: 20px 52px 20px 22px;
        text-decoration: none;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .option-tile:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 26px rgba(11,31,58,0.1);
        border-color: rgba(15,138,128,0.4);
      }
      .option-eyebrow {
        display: block;
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--teal-600);
        margin-bottom: 6px;
      }
      .option-title {
        display: block;
        font-family: var(--font-display);
        font-size: 18px;
        font-weight: 700;
        color: var(--navy-900);
      }
      .option-blurb {
        display: block;
        font-size: 13px;
        color: var(--ink-muted);
        margin-top: 6px;
        line-height: 1.5;
      }
      .option-arrow {
        position: absolute;
        top: 50%;
        right: 20px;
        transform: translateY(-50%);
        color: var(--teal-600);
        font-size: 18px;
      }

      .home-footer {
        margin-top: 28px;
        padding-top: 22px;
        border-top: 1px solid var(--line);
        text-align: center;
      }
      .track-link {
        font-size: 13.5px;
        color: var(--teal-600);
        font-weight: 600;
        text-decoration: none;
      }
      .track-link:hover { text-decoration: underline; }

      @media (max-width: 640px) {
        .home-card { padding: 30px 22px 26px; }
        .page-shell { padding: 32px 0 60px; }
        .option-tile { padding: 18px 44px 18px 18px; }
      }
    `}</style>
  );
}
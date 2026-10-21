import { Link } from "react-router-dom";
const kpLogo = "/documents/kerala-paints-logo.png";

const STEPS = [
  {
    title: "Register",
    text: "Enter your purchase, painting and site details. We email a code to confirm your address.",
  },
  {
    title: "We review",
    text: "Our team checks your registration and emails you as soon as it is approved.",
  },
  {
    title: "Claim",
    text: "If something goes wrong, file a claim with your invoice number and mobile number, then follow it with your claim number.",
  },
];

// The logo's swoosh, drawn as two blades. Each is revealed by a thick stroke
// that is "painted" along its centre line once, when the page loads.
function HeroRibbon() {
  return (
    <svg className="hero-ribbon" viewBox="0 0 520 440" aria-hidden="true" focusable="false">
      <defs>
        <mask id="kp-reveal-a" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="440">
          <path className="reveal" pathLength="1" d="M10 400C120 250 330 330 512 30" />
        </mask>
        <mask id="kp-reveal-b" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="440">
          <path className="reveal r2" pathLength="1" d="M10 400C120 250 330 330 512 30" />
        </mask>
      </defs>
      <path
        mask="url(#kp-reveal-a)"
        fill="#2c2e78"
        d="M10 400C16.4 396.3 36.2 384.1 48.7 378C61.2 371.9 72.3 367.6 85.2 363.2C98.1 358.8 112.9 355 126.2 351.4C139.5 347.8 151.7 345.1 165.1 341.5C178.5 337.9 192.4 334.3 206.8 329.7C221.2 325.1 236.2 320.2 251.4 313.9C266.6 307.6 282.3 300.5 297.9 291.8C313.5 283.1 329.5 273.4 345 261.9C360.5 250.4 375.3 238.5 391 222.7C406.7 206.9 424.5 186.6 439 167C453.5 147.4 466 127.9 478.2 105.1C490.4 82.3 506.4 42.5 512 30C502.6 39.6 473.6 70.6 455.4 87.6C437.2 104.6 420.8 118.4 403 131.8C385.2 145.2 365.1 157.9 348.4 167.9C331.6 177.9 317.4 184.8 302.5 192C287.6 199.2 273.1 205.3 258.8 211.4C244.5 217.5 230.5 222.8 216.6 228.6C202.7 234.4 189 239.8 175.4 246C161.8 252.2 148.2 258.4 135 265.5C121.8 272.6 109.4 279.5 96.5 288.8C83.6 298.1 68.9 309.8 57.7 321.1C46.5 332.5 37.1 343.8 29.2 356.9C21.2 370 13.2 392.8 10 400Z"
      />
      <path
        mask="url(#kp-reveal-b)"
        fill="#26b2e7"
        d="M17.2 405.4C24.9 403.5 49.5 396.8 63.7 394.2C78 391.6 89.4 391 102.7 390C116 389 130.4 389.1 143.6 388.2C156.8 387.3 168.6 386.6 182.1 384.6C195.6 382.6 209.6 380.3 224.3 376.4C239.1 372.5 254.7 367.7 270.6 361.1C286.5 354.5 303.2 346.6 319.6 336.7C336 326.8 353.1 315.1 369.1 301.5C385.2 287.9 400.4 273.5 415.9 254.8C431.3 236.1 448.5 212.1 461.8 189.4C475.1 166.7 486.1 144.3 495.8 118.5C505.5 92.7 515.7 48.7 519.7 34.7C514 47.4 497.8 87.5 485.4 110.6C473 133.7 460.2 153.4 445.4 173.3C430.6 193.2 412.5 213.8 396.5 229.8C380.5 245.9 365.4 257.9 349.6 269.6C333.8 281.3 317.6 291.1 301.8 299.9C286 308.7 270.1 315.8 254.8 322.2C239.5 328.6 224.4 333.6 210 338.2C195.6 342.8 181.7 346.3 168.4 349.9C155.1 353.5 143.1 356.1 130.1 359.6C117.1 363.1 102.8 366.6 90.2 370.8C77.7 375 67 378.8 54.8 384.6C42.6 390.4 23.5 401.9 17.2 405.4Z"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="home-shell">
      <div className="home-wrap">
        <header className="home-header">
          <img
            className="home-logo"
            src="/documents/kerala-paints-logo.png"
            alt="Kerala Paints, Colours of Care"
            width="115"
            height="64"
          />
          <nav className="home-nav" aria-label="Quick links">
            <Link to="/warranty-policy">Warranty policy</Link>
            <Link to="/track">Track a claim</Link>
          </nav>
        </header>

        <main>
          <section className="hero">
            <div className="hero-copy">
              <h1>Register your paint warranty. Claim it when you need it.</h1>
              <p className="hero-lead">
                Register within 15 days of finishing the job. After that, all you need to make a
                claim is your invoice number and mobile number.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" to="/warranty/register">
                  Register your warranty
                </Link>
                <Link className="btn btn-ghost btn-lg" to="/claim">
                  Claim warranty
                </Link>
              </div>
            </div>
            <div className="hero-art">
              <HeroRibbon />
            </div>
          </section>

          <section className="how" aria-labelledby="how-title">
            <h2 id="how-title">How it works</h2>
            <ol className="steps">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <footer className="home-footer">
          <p>
            Questions? Write to <a href="mailto:warranty@keralapaints.com">warranty@keralapaints.com</a>{" "}
            or call <a href="tel:+919539320999">+91 9539 320 999</a>.
          </p>
        </footer>
      </div>
      <HomeStyles />
    </div>
  );
}

function HomeStyles() {
  return (
    <style>{`
      .home-shell { min-height: 100vh; min-height: 100dvh; }
      .home-wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding: 0 28px; }

      .home-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 0 4px; }
      .home-logo { height: 64px; width: auto; display: block; }
      .home-nav { display: flex; gap: 4px; }
      .home-nav a {
        padding: 10px 16px; border-radius: 999px; font-size: 14.5px; font-weight: 600;
        color: var(--navy-800); text-decoration: none; transition: background-color 0.2s ease;
      }
      .home-nav a:hover { background: var(--teal-100); }

      .hero { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr); align-items: center; gap: 24px; padding: 36px 0 60px; }
      .hero h1 {
        font-size: clamp(36px, 5.6vw, 62px); line-height: 1.03; letter-spacing: -0.03em;
        text-wrap: balance;
      }
      .hero-lead { margin-top: 20px; max-width: 46ch; font-size: clamp(16px, 1.9vw, 19px); line-height: 1.6; color: var(--ink-muted); }
      .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
      .btn-lg { min-height: 56px; padding: 14px 32px; font-size: 16.5px; }

      .hero-art { min-width: 0; align-self: center; }
      .hero-ribbon { display: block; width: 100%; height: auto; max-height: 430px; }
      .hero-ribbon .reveal {
        fill: none; stroke: #fff; stroke-width: 270;
        stroke-dasharray: 1; stroke-dashoffset: 0;
        animation: kp-paint 1.5s cubic-bezier(0.55, 0.1, 0.25, 1) 0.15s backwards;
      }
      .hero-ribbon .reveal.r2 { animation-delay: 0.5s; }
      @keyframes kp-paint { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

      .how { padding: 8px 0 72px; }
      .how h2 { font-size: 26px; margin-bottom: 28px; }
      .steps { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; counter-reset: kp-step; }
      .steps li { position: relative; padding-top: 68px; counter-increment: kp-step; }
      .steps li::before {
        content: counter(kp-step); position: absolute; top: 0; left: 0;
        display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%;
        background: var(--navy-800); color: #fff; font-family: var(--font-display); font-size: 20px; font-weight: 800;
      }
      .steps li:not(:last-child)::after {
        content: ""; position: absolute; top: 20px; left: 60px; width: calc(100% + 32px - 60px - 14px); height: 6px; border-radius: 3px;
        background: linear-gradient(90deg, var(--navy-800), var(--teal-500)); transform: skewX(-22deg);
      }
      .steps h3 { font-size: 20px; }
      .steps p { margin-top: 8px; max-width: 34ch; font-size: 15.5px; line-height: 1.6; color: var(--ink-muted); }

      .home-footer { padding: 28px 0 44px; border-top: 1px solid var(--line); font-size: 14.5px; color: var(--ink-muted); }
      .home-footer a { color: var(--navy-800); font-weight: 600; }

      @media (max-width: 860px) {
        .hero { grid-template-columns: 1fr; padding: 20px 0 40px; gap: 4px; }
        .hero-art { order: -1; width: min(300px, 74%); margin: 0 0 0 auto; }
        .hero h1 { font-size: clamp(34px, 9.4vw, 46px); }
        .steps { grid-template-columns: 1fr; gap: 0; }
        .steps li { padding: 4px 0 34px 66px; }
        .steps li:last-child { padding-bottom: 4px; }
        .steps li:not(:last-child)::after {
          top: 52px; left: 20px; width: 6px; height: calc(100% - 52px - 6px); transform: none;
          background: linear-gradient(180deg, var(--navy-800), var(--teal-500));
        }
      }
      @media (max-width: 480px) {
        .home-wrap { padding: 0 18px; }
        .home-logo { height: 46px; }
        .home-nav a { padding: 9px 10px; font-size: 13.5px; }
        .hero-actions .btn { width: 100%; }
      }
    `}</style>
  );
}
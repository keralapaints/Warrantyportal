import { useCallback, useEffect, useRef, useState } from "react";

// Sticky progress bar for the registration form. It reads the page's own
// numbered sections (.form-card .section), so it never needs the form's field
// list — add or remove a section and it follows.

const SHORT_LABELS = {
  "products purchased": "Products",
  "painting system used": "Painting",
  "surface condition before painting": "Surface",
};

const labelFor = (text) => SHORT_LABELS[text.trim().toLowerCase()] || text.trim();

// Fields whose hint starts "Optional" or "Recommended" don't count as required.
function isOptional(field) {
  const hint = field.querySelector(".hint");
  return !!hint && /^(optional|recommended)/i.test(hint.textContent.trim());
}

function measureSection(sectionEl) {
  let total = 0;
  let done = 0;

  sectionEl.querySelectorAll(".field").forEach((field) => {
    if (isOptional(field)) return;
    const control = field.querySelector("input:not(.otp-code-input), select, textarea");
    if (!control) return;
    total += 1;
    const filled = String(control.value ?? "").trim() !== "";
    // The email only counts once the code has been verified.
    const isEmail = !!field.querySelector(".email-row");
    if (isEmail ? filled && !!field.querySelector(".verified-badge") : filled) done += 1;
  });

  // Mandatory declarations are checkboxes rather than .field blocks.
  sectionEl.querySelectorAll(".decl-row:not(.optional) input[type='checkbox']").forEach((box) => {
    total += 1;
    if (box.checked) done += 1;
  });

  return { total, done, complete: total > 0 && done === total };
}

const sameSteps = (a, b) =>
  a.length === b.length &&
  a.every((s, i) => s.label === b[i].label && s.done === b[i].done && s.total === b[i].total);

function Tick() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FormProgress() {
  const [steps, setSteps] = useState([]);
  const [active, setActive] = useState(0);
  const barRef = useRef(null);
  const railRef = useRef(null);
  const jumpingRef = useRef(false);
  const unlockTimer = useRef(0);

  const measureFields = useCallback(() => {
    const sections = Array.from(document.querySelectorAll(".form-card .section"));
    const next = sections.map((el) => ({
      label: labelFor(el.querySelector("h3")?.textContent || "Section"),
      ...measureSection(el),
    }));
    setSteps((prev) => (sameSteps(prev, next) ? prev : next));
  }, []);

  const measureActive = useCallback(() => {
    if (jumpingRef.current) return;
    const sections = Array.from(document.querySelectorAll(".form-card .section"));
    if (!sections.length) return;
    const line = (barRef.current?.offsetHeight ?? 90) + 40;
    let idx = 0;
    sections.forEach((el, i) => {
      if (el.getBoundingClientRect().top - line <= 0) idx = i;
    });
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6;
    setActive(atBottom ? sections.length - 1 : idx);
  }, []);

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const onScroll = () => {
      // While a tapped jump is scrolling, wait until the page stops moving.
      if (jumpingRef.current) {
        clearTimeout(unlockTimer.current);
        unlockTimer.current = setTimeout(() => {
          jumpingRef.current = false;
          measureActive();
        }, 160);
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measureActive);
    };
    // Wait a tick so React has applied the change that triggered the event.
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        measureFields();
        measureActive();
      }, 0);
    };

    measureFields();
    measureActive();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("input", onChange);
    document.addEventListener("change", onChange);
    document.addEventListener("click", onChange);

    const form = document.querySelector(".form-card form");
    const observer = new MutationObserver(onChange);
    if (form) observer.observe(form, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      clearTimeout(unlockTimer.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("input", onChange);
      document.removeEventListener("change", onChange);
      document.removeEventListener("click", onChange);
      observer.disconnect();
    };
  }, [measureFields, measureActive]);

  // On phones the step row scrolls sideways; keep the current step in view.
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.children[active]?.firstElementChild;
    if (!rail || !chip) return;
    rail.scrollTo({
      left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2,
      behavior: "smooth",
    });
  }, [active]);

  const goTo = (i) => {
    const el = document.querySelectorAll(".form-card .section")[i];
    if (!el) return;
    // Highlight the target straight away instead of flickering through the steps between.
    setActive(i);
    jumpingRef.current = true;
    clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      jumpingRef.current = false;
      measureActive();
    }, 1400);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const doneSections = steps.filter((s) => s.complete).length;
  const totalFields = steps.reduce((n, s) => n + s.total, 0);
  const doneFields = steps.reduce((n, s) => n + s.done, 0);
  const pct = totalFields ? Math.round((doneFields / totalFields) * 100) : 0;

  return (
    <>
      <div className="fp" ref={barRef} role="navigation" aria-label="Registration progress">
        <div className="fp-head">
          <span className="fp-where">
            Step {Math.min(active + 1, Math.max(steps.length, 1))} of {Math.max(steps.length, 1)}
            {steps[active] ? `: ${steps[active].label}` : ""}
          </span>
          <span className="fp-pct">{pct}% complete</span>
        </div>

        <ol className="fp-rail" ref={railRef}>
          {steps.map((s, i) => (
            <li key={s.label + i}>
              <button
                type="button"
                className={`fp-step${s.complete ? " is-done" : ""}${i === active ? " is-active" : ""}`}
                aria-current={i === active ? "step" : undefined}
                aria-label={`${s.label}, ${s.complete ? "complete" : "not complete"}`}
                title={s.label}
                onClick={() => goTo(i)}
              >
                <span className="fp-dot">{s.complete ? <Tick /> : i + 1}</span>
                <span className="fp-label">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>

        <div
          className="fp-track"
          role="progressbar"
          aria-label="Form completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="fp-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <FormProgressStyles />
    </>
  );
}

function FormProgressStyles() {
  return (
    <style>{`
      .fp {
        position: sticky;
        top: 10px;
        z-index: 40;
        margin-bottom: 14px;
        padding: 14px 18px 16px;
        background: rgba(255, 255, 255, 0.92);
        -webkit-backdrop-filter: blur(14px);
        backdrop-filter: blur(14px);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: 0 8px 28px rgba(44, 46, 120, 0.12);
      }
      .fp-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .fp-where {
        font-family: var(--font-display);
        font-size: 15px;
        font-weight: 700;
        color: var(--navy-900);
      }
      .fp-pct {
        font-size: 13px;
        font-weight: 700;
        color: var(--teal-600);
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .fp-rail {
        display: flex;
        justify-content: space-between;
        gap: 4px;
        margin: 0 0 12px;
        padding: 0;
        list-style: none;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .fp-rail::-webkit-scrollbar { display: none; }
      .fp-rail li { flex: 0 0 auto; }

      .fp-step {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        padding: 4px;
        border: 1.5px solid transparent;
        border-radius: 999px;
        background: transparent;
        color: var(--navy-900);
        font-size: 13.5px;
        font-weight: 700;
        white-space: nowrap;
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }
      .fp-step:hover { background: rgba(44, 46, 120, 0.07); }
      .fp-label { display: none; }
      .fp-dot {
        flex: none;
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1.5px solid #c3cde4;
        background: #fff;
        color: var(--ink-muted);
        font-size: 13px;
        font-weight: 700;
        transition: all 0.25s ease;
      }
      .fp-step.is-done .fp-dot {
        background: var(--navy-800);
        border-color: var(--navy-800);
        color: #fff;
      }
      .fp-step.is-active {
        background: var(--teal-100);
        border-color: rgba(38, 178, 231, 0.5);
      }
      .fp-step.is-active .fp-label { display: inline; padding-right: 12px; }
      .fp-step.is-active .fp-dot:not(:has(svg)) {
        border-color: var(--teal-500);
        color: var(--navy-800);
        box-shadow: 0 0 0 3px rgba(38, 178, 231, 0.22);
      }

      /* The paint stroke: its leading edge is cut on the slant of the logo. */
      .fp-track {
        height: 10px;
        border-radius: 5px;
        background: rgba(44, 46, 120, 0.1);
        overflow: hidden;
      }
      .fp-fill {
        height: 100%;
        min-width: 0;
        background: linear-gradient(90deg, var(--navy-800) 0%, #2f5fc0 55%, var(--teal-500) 100%);
        clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
        border-radius: 5px 0 0 5px;
        transition: width 0.6s cubic-bezier(0.22, 0.8, 0.3, 1);
      }
      .fp-fill[style*="width: 0%"] { clip-path: none; }
      .fp-fill[style*="width: 100%"] { clip-path: none; border-radius: 5px; }

      @media (max-width: 640px) {
        .fp { top: 6px; margin: 0 -4px 10px; padding: 12px 12px 14px; border-radius: 16px; }
        .fp-where { font-size: 14px; }
        .fp-rail { gap: 0; }
        .fp-step { min-height: 0; padding: 3px; }
        .fp-dot { width: 28px; height: 28px; font-size: 12.5px; }
        .fp-step.is-active .fp-label { display: none; }
        .fp-step.is-active { padding: 3px; }
      }
      @media (max-width: 350px) {
        .fp-step { padding: 2px; }
        .fp-dot { width: 24px; height: 24px; font-size: 11.5px; }
      }
    `}</style>
  );
}
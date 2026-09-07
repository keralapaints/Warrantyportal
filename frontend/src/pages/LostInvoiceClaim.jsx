import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { DISTRICTS } from "../data/options";

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  customerName: "",
  mobileNumber: "",
  email: "",
  siteName: "",
  street: "",
  siteDistrict: "",
  approxPurchaseDate: "",
  productDescription: "",
  complaintText: "",
};

function Field({ label, error, hint, children }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label>{label}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export default function LostInvoiceClaim() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    const e = {};
    if (form.customerName.trim().length < 2) e.customerName = "Enter your full name.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobileNumber.trim())) e.mobileNumber = "Enter a valid mobile number.";
    if (!form.siteName.trim()) e.siteName = "Enter the site / building name you registered.";
    if (!form.siteDistrict) e.siteDistrict = "Select the district.";
    if (!form.productDescription.trim()) e.productDescription = "Tell us which product(s) this is about.";
    if (!form.complaintText.trim()) e.complaintText = "Describe the issue.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await client.post("/warranty/lost-invoice", form);
      setResult(data);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page-shell">
        <div className="container narrow">
          <div className="glass-card card">
            <span className="eyebrow">Request received</span>
            <h1>We'll take it from here</h1>
            <p className="copy">
              Our team will manually look up your warranty registration and get in touch once
              it's reviewed. Keep this reference number for follow-up.
            </p>
            <div className="token-badge token-badge-lg">{result.token}</div>
            <div className="actions">
              <Link className="btn btn-primary" to="/">
                Back to home
              </Link>
            </div>
          </div>
        </div>
        <Styles />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card card">
          <span className="eyebrow">Kerala Paints · Warranty</span>
          <h1>Lost your invoice?</h1>
          <p className="copy">
            No problem — tell us what you remember and our team will manually look up your
            registration. This usually takes longer than the normal claim process since it
            requires a manual match.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-2">
              <Field label="Your name" error={errors.customerName}>
                <input type="text" value={form.customerName} onChange={update("customerName")} />
              </Field>
              <Field label="Mobile number" error={errors.mobileNumber} hint="The number used when registering, if you remember">
                <input type="tel" value={form.mobileNumber} onChange={update("mobileNumber")} />
              </Field>
            </div>
            <Field label="Email" hint="Optional">
              <input type="email" value={form.email} onChange={update("email")} />
            </Field>

            <div className="grid grid-2" style={{ marginTop: 14 }}>
              <Field label="Site / building name" error={errors.siteName} hint="As given during registration">
                <input type="text" value={form.siteName} onChange={update("siteName")} />
              </Field>
              <Field label="District" error={errors.siteDistrict}>
                <select value={form.siteDistrict} onChange={update("siteDistrict")}>
                  <option value="">Select district</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Street / locality" hint="Optional">
              <input type="text" value={form.street} onChange={update("street")} />
            </Field>
            <Field label="Approximate purchase date" hint="Optional, your best guess">
              <input type="date" value={form.approxPurchaseDate} onChange={update("approxPurchaseDate")} max={todayISO()} />
            </Field>

            <Field label="Which product(s) is this about?" error={errors.productDescription} hint="Names, shades, anything you remember">
              <textarea
                style={{ minHeight: 90 }}
                value={form.productDescription}
                onChange={update("productDescription")}
                placeholder="e.g. Silver Ex, white, exterior walls"
              />
            </Field>

            <Field label="Describe the issue" error={errors.complaintText}>
              <textarea
                style={{ minHeight: 120 }}
                value={form.complaintText}
                onChange={update("complaintText")}
                placeholder="What happened? Include as much detail as you can."
              />
            </Field>

            {submitError && <div className="submit-error">{submitError}</div>}

            <div className="actions" style={{ justifyContent: "space-between" }}>
              <Link to="/claim" className="track-link">← Back to claim portal</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .page-shell { min-height: 100vh; padding: 56px 0 80px; display: flex; align-items: flex-start; justify-content: center; }
      .container.narrow { max-width: 640px; }
      .card { padding: 40px 36px 36px; }
      .card h1 { font-size: 26px; margin-top: 6px; }
      .copy { color: var(--ink-muted); margin-top: 10px; font-size: 14px; line-height: 1.55; }
      .grid { display: grid; gap: 14px; margin-bottom: 14px; }
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .submit-error { margin-top: 16px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 13px; font-size: 13px; font-weight: 500; }
      .token-badge-lg { font-size: 19px; padding: 12px 22px; margin: 18px 0 20px; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; align-items: center; }
      .track-link { font-size: 13.5px; color: var(--teal-600); font-weight: 600; text-decoration: none; }
      @media (max-width: 640px) {
        .grid-2 { grid-template-columns: 1fr; }
        .card { padding: 28px 20px 24px; }
      }
    `}</style>
  );
}
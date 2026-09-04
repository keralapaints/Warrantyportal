import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function WarrantyClaim() {
  const [step, setStep] = useState("verify");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [registration, setRegistration] = useState(null);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError("");
    if (!invoiceNumber.trim() || !contactNumber.trim()) {
      setVerifyError("Enter both your invoice number and mobile number.");
      return;
    }
    setVerifying(true);
    try {
      const { data } = await client.get("/warranty/verify", {
        params: { invoiceNumber: invoiceNumber.trim(), contactNumber: contactNumber.trim() },
      });
      setRegistration(data);
      setStep("claim");
    } catch (err) {
      setVerifyError(err.response?.data?.message || "Could not verify your registration. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (step === "claim" && registration) {
    return <ClaimForm registration={registration} onBack={() => setStep("verify")} />;
  }

  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card verify-card">
          <span className="eyebrow">Kerala Paints · Warranty</span>
          <h1>Claim your warranty</h1>
          <p className="verify-intro">
            Enter the invoice number and mobile number you used when registering, and we'll pull
            up your registered products.
          </p>

          <form onSubmit={handleVerify}>
            <div className="field">
              <label>Invoice number</label>
              <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="field" style={{ marginTop: 16 }}>
              <label>Mobile number</label>
              <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>

            {verifyError && (
              <div className="verify-error">
                {verifyError}{" "}
                <Link to="/warranty/register" className="inline-link">Register now</Link>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={verifying} style={{ width: "100%", marginTop: 20 }}>
              {verifying ? "Checking…" : "Verify & continue"}
            </button>
          </form>

          <Link to="/" className="back-link">← Back to home</Link>
        </div>
      </div>
      <VerifyStyles />
    </div>
  );
}

function ClaimForm({ registration, onBack }) {
  const [selected, setSelected] = useState(() => new Set([0]));
  const [complaintText, setComplaintText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function toggleItem(index) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (selected.size === 0) {
      setError("Select at least one product to claim on.");
      return;
    }
    if (!complaintText.trim()) {
      setError("Describe the issue.");
      return;
    }

    setSubmitting(true);
    try {
      const items = registration.items.filter((_, i) => selected.has(i));
      const { data } = await client.post("/complaints", {
        warrantyToken: registration.token,
        date: new Date().toISOString().slice(0, 10),
        district: registration.siteDistrict,
        outlet: registration.outlet,
        customerName: registration.customerName,
        contactNumber: registration.mobileNumber,
        address: `${registration.siteName}, ${registration.street}`,
        invoiceNumber: registration.invoiceNumber,
        complaintText: complaintText.trim(),
        items,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit the claim. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page-shell">
        <div className="container narrow">
          <div className="glass-card verify-card">
            <span className="eyebrow">Claim received</span>
            <h1>We've logged your claim</h1>
            <p className="verify-intro">Keep this token to check on the status of your claim any time.</p>
            <div className="token-badge token-badge-lg">{result.token}</div>
            <div className="confirm-actions">
              <Link className="btn btn-primary" to="/track" state={{ token: result.token }}>Track this claim</Link>
              <Link className="btn btn-ghost" to="/">Back to home</Link>
            </div>
          </div>
        </div>
        <VerifyStyles />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card verify-card">
          <span className="eyebrow">Kerala Paints · Warranty</span>
          <h1>File your claim</h1>
          <p className="verify-intro">
            Registered to <strong>{registration.customerName}</strong> · {registration.siteDistrict} /{" "}
            {registration.outlet} · Invoice {registration.invoiceNumber}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="field" style={{ marginTop: 18 }}>
              <label>Which product(s) is this about?</label>
              <div className="item-checklist">
                {registration.items.map((it, i) => (
                  <label className="item-check-row" key={i}>
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggleItem(i)} />
                    <span>
                      <strong>{it.product}</strong> — {it.shadeType} · {it.containers} × {it.packSize}
                      {it.totalQuantity ? ` (${it.totalQuantity})` : ""} · Batch{" "}
                      {(it.batchNumbers || []).join(", ")}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginTop: 18 }}>
              <label>Describe the issue</label>
              <textarea style={{ minHeight: 130 }} value={complaintText} onChange={(e) => setComplaintText(e.target.value)} />
            </div>

            {error && <div className="verify-error">{error}</div>}

            <div className="form-actions">
              <button type="button" className="track-link as-button" onClick={onBack}>← Verify a different invoice</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit claim"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <VerifyStyles />
    </div>
  );
}

function VerifyStyles() {
  return (
    <style>{`
      .page-shell { min-height: 100vh; padding: 56px 0 80px; display: flex; align-items: flex-start; justify-content: center; }
      .container.narrow { max-width: 640px; }
      .verify-card { padding: 40px 36px 36px; }
      .verify-card h1 { font-size: 26px; margin-top: 6px; }
      .verify-intro { color: var(--ink-muted); margin-top: 10px; font-size: 14px; line-height: 1.55; }
      .verify-error { margin-top: 16px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 13px; font-size: 13px; font-weight: 500; }
      .inline-link { color: var(--status-danger); text-decoration: underline; font-weight: 700; }
      .back-link { display: block; margin-top: 26px; font-size: 13.5px; color: var(--teal-600); font-weight: 600; text-decoration: none; }
      .token-badge-lg { font-size: 20px; padding: 12px 22px; margin: 18px 0 26px; }
      .confirm-actions { display: flex; gap: 12px; flex-wrap: wrap; }
      .item-checklist { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
      .item-check-row { display: flex; align-items: flex-start; gap: 10px; background: rgba(15,138,128,0.05); border: 1px solid var(--line); border-radius: 9px; padding: 12px 14px; font-size: 13px; cursor: pointer; }
      .item-check-row input { margin-top: 3px; }
      .form-actions { margin-top: 26px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .track-link { font-size: 13.5px; color: var(--teal-600); font-weight: 600; text-decoration: none; }
      .track-link.as-button { background: none; border: none; cursor: pointer; padding: 0; }
      @media (max-width: 640px) { .verify-card { padding: 28px 20px 24px; } }
    `}</style>
  );
}
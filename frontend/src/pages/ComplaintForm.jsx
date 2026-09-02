import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { DISTRICTS, OUTLETS_BY_DISTRICT, PRODUCTS, QUANTITIES_BY_PRODUCT } from "../data/options";

const SWATCHES = ["#0f8a80", "#2f6fed", "#d97a13", "#12946f", "#0b1f3a"];

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  date: todayISO(),
  district: "",
  outlet: "",
  customerName: "",
  contactNumber: "",
  address: "",
  invoiceNumber: "",
  product: "",
  batchNo: "",
  quantity: "",
  code: "",
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

export default function ComplaintForm() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function updateDistrict(e) {
    // Changing district invalidates whatever outlet was picked, since
    // outlet options depend on the district.
    setForm((f) => ({ ...f, district: e.target.value, outlet: "" }));
  }

  function updateProduct(e) {
    // Changing product invalidates whatever quantity was picked, since
    // pack sizes differ per product.
    setForm((f) => ({ ...f, product: e.target.value, quantity: "" }));
  }

  const outletOptions = form.district ? OUTLETS_BY_DISTRICT[form.district] || [] : [];
  const quantityOptions = form.product ? QUANTITIES_BY_PRODUCT[form.product] || [] : [];

  function validate() {
    const e = {};
    if (!form.date) e.date = "Select the date.";
    if (!form.district) e.district = "Select a district.";
    if (!form.outlet) e.outlet = "Select an outlet.";
    if (!form.customerName.trim()) e.customerName = "Enter the customer's name.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.contactNumber.trim()))
      e.contactNumber = "Enter a valid contact number.";
    if (!form.address.trim()) e.address = "Enter the address.";
    if (!form.invoiceNumber.trim()) e.invoiceNumber = "Enter the invoice number.";
    if (!form.product) e.product = "Select a product.";
    if (!form.batchNo || Number.isNaN(Number(form.batchNo))) e.batchNo = "Enter a valid batch number.";
    if (!form.quantity) e.quantity = "Select the quantity.";
    if (!form.code || Number.isNaN(Number(form.code))) e.code = "Enter a valid code.";
    if (!form.complaintText.trim()) e.complaintText = "Describe the complaint.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await client.post("/complaints", {
        ...form,
        batchNo: Number(form.batchNo),
        code: Number(form.code),
      });
      setResult(data);
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || "Could not submit the complaint. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page-shell">
        <div className="container narrow">
          <div className="glass-card confirm-card">
            <div className="swatch-strip">
              {SWATCHES.map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </div>
            <span className="eyebrow">Complaint received</span>
            <h1>We've logged your complaint</h1>
            <p className="confirm-copy">
              Keep this token to check on the status of your complaint any time.
            </p>
            <div className="token-badge token-badge-lg">{result.token}</div>
            <div className="confirm-actions">
              <Link className="btn btn-primary" to="/track" state={{ token: result.token }}>
                Track this complaint
              </Link>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm(emptyForm);
                  setResult(null);
                }}
              >
                Submit another
              </button>
            </div>
          </div>
        </div>
        <FormStyles />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card form-card">
          <div className="swatch-strip">
            {SWATCHES.map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
          <span className="eyebrow">Kerala Paints · Complaint Desk</span>
          <h1>Tell us what went wrong</h1>
          <p className="form-intro">
            Fill in the details below and we'll open a complaint token for our team to act on.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="section">
              <h3>Complaint details</h3>
              <div className="grid grid-3">
                <Field label="Date" error={errors.date}>
                  <input type="date" value={form.date} onChange={update("date")} max={todayISO()} />
                </Field>
                <Field label="District" error={errors.district}>
                  <select value={form.district} onChange={updateDistrict}>
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Outlet"
                  error={errors.outlet}
                  hint={!form.district ? "Select a district first" : undefined}
                >
                  <select value={form.outlet} onChange={update("outlet")} disabled={!form.district}>
                    <option value="">
                      {form.district ? "Select outlet" : "Select a district first"}
                    </option>
                    {outletOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="section">
              <h3>Customer details</h3>
              <div className="grid grid-2">
                <Field label="Name of the customer" error={errors.customerName}>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={form.customerName}
                    onChange={update("customerName")}
                  />
                </Field>
                <Field label="Contact number" error={errors.contactNumber}>
                  <input
                    type="tel"
                    placeholder="e.g. 9847012345"
                    value={form.contactNumber}
                    onChange={update("contactNumber")}
                  />
                </Field>
              </div>
              <Field label="Address" error={errors.address}>
                <textarea
                  placeholder="House name, street, place, pincode"
                  value={form.address}
                  onChange={update("address")}
                />
              </Field>
            </div>

            <div className="section">
              <h3>Product details</h3>
              <div className="grid grid-2">
                <Field label="Invoice number" error={errors.invoiceNumber}>
                  <input
                    type="text"
                    placeholder="Invoice / bill number"
                    value={form.invoiceNumber}
                    onChange={update("invoiceNumber")}
                  />
                </Field>
                <Field label="Product" error={errors.product}>
                  <select value={form.product} onChange={updateProduct}>
                    <option value="">Select product</option>
                    {PRODUCTS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-3">
                <Field label="Batch no." error={errors.batchNo}>
                  <input
                    type="number"
                    placeholder="Batch number"
                    value={form.batchNo}
                    onChange={update("batchNo")}
                  />
                </Field>
                <Field
                  label="Quantity"
                  error={errors.quantity}
                  hint={!form.product ? "Select a product first" : undefined}
                >
                  <select value={form.quantity} onChange={update("quantity")} disabled={!form.product}>
                    <option value="">
                      {form.product ? "Select quantity" : "Select a product first"}
                    </option>
                    {quantityOptions.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Code" error={errors.code}>
                  <input type="number" placeholder="Code" value={form.code} onChange={update("code")} />
                </Field>
              </div>
            </div>

            <div className="section">
              <h3>Complaint</h3>
              <Field label="Describe the complaint" error={errors.complaintText}>
                <textarea
                  placeholder="What happened? Include as much detail as you can."
                  value={form.complaintText}
                  onChange={update("complaintText")}
                  style={{ minHeight: 130 }}
                />
              </Field>
            </div>

            {submitError && <div className="submit-error">{submitError}</div>}

            <div className="form-actions">
              <Link to="/track" className="track-link">
                Already have a token? Track it
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit complaint"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <FormStyles />
    </div>
  );
}

function FormStyles() {
  return (
    <style>{`
      .page-shell {
        min-height: 100vh;
        padding: 56px 0 80px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .container.narrow {
        max-width: 720px;
      }
      .form-card, .confirm-card {
        padding: 40px 36px 36px;
        animation: rise 0.5s ease both;
      }
      @keyframes rise {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .swatch-strip {
        display: flex;
        gap: 6px;
        margin-bottom: 20px;
      }
      .swatch-strip span {
        width: 28px;
        height: 6px;
        border-radius: 3px;
      }
      .form-card h1, .confirm-card h1 {
        font-size: 28px;
        margin-top: 6px;
      }
      .form-intro, .confirm-copy {
        color: var(--ink-muted);
        margin-top: 10px;
        font-size: 14.5px;
        line-height: 1.5;
      }
      .section {
        margin-top: 30px;
        padding-top: 22px;
        border-top: 1px solid var(--line);
      }
      .section:first-of-type {
        border-top: none;
        margin-top: 26px;
      }
      .section h3 {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--teal-600);
        margin-bottom: 16px;
      }
      .grid {
        display: grid;
        gap: 16px;
        margin-bottom: 16px;
      }
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .field select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .form-actions {
        margin-top: 30px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }
      .track-link {
        font-size: 13.5px;
        color: var(--teal-600);
        font-weight: 600;
        text-decoration: none;
      }
      .track-link:hover { text-decoration: underline; }
      .submit-error {
        margin-top: 20px;
        background: #fdeceb;
        color: var(--status-danger);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        font-size: 13.5px;
        font-weight: 500;
      }
      .token-badge-lg {
        font-size: 20px;
        padding: 12px 22px;
        margin: 18px 0 26px;
      }
      .confirm-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      @media (max-width: 640px) {
        .grid-2, .grid-3 { grid-template-columns: 1fr; }
        .form-card, .confirm-card { padding: 30px 22px 26px; }
        .page-shell { padding: 32px 0 60px; }
      }
    `}</style>
  );
}
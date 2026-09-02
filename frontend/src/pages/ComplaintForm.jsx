import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { DISTRICTS, OUTLETS_BY_DISTRICT, PRODUCTS, QUANTITIES_BY_PRODUCT } from "../data/options";

const SWATCHES = ["#0f8a80", "#2f6fed", "#d97a13", "#12946f", "#0b1f3a"];

const todayISO = () => new Date().toISOString().slice(0, 10);

let itemUid = 0;
const newItem = () => ({ uid: itemUid++, product: "", batchNo: "", quantity: "", code: "" });

const emptyForm = {
  date: todayISO(),
  district: "",
  outlet: "",
  customerName: "",
  contactNumber: "",
  address: "",
  invoiceNumber: "",
  complaintText: "",
  items: [newItem()],
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
    setForm((f) => ({ ...f, district: e.target.value, outlet: "" }));
  }

  function updateItem(index, key) {
    return (e) => {
      const value = e.target.value;
      setForm((f) => ({
        ...f,
        items: f.items.map((it, i) => {
          if (i !== index) return it;
          // Changing a product invalidates whatever quantity was picked
          // for that same row, since pack sizes differ per product.
          if (key === "product") return { ...it, product: value, quantity: "" };
          return { ...it, [key]: value };
        }),
      }));
    };
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
  }

  function removeItem(index) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  const outletOptions = form.district ? OUTLETS_BY_DISTRICT[form.district] || [] : [];

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
    if (!form.complaintText.trim()) e.complaintText = "Describe the complaint.";

    const itemErrors = form.items.map((it) => {
      const ie = {};
      if (!it.product) ie.product = "Select a product.";
      if (!it.batchNo || Number.isNaN(Number(it.batchNo))) ie.batchNo = "Enter a valid batch number.";
      if (!it.quantity) ie.quantity = "Select the quantity.";
      if (!it.code || Number.isNaN(Number(it.code))) ie.code = "Enter a valid code.";
      return ie;
    });
    if (itemErrors.some((ie) => Object.keys(ie).length > 0)) {
      e.items = itemErrors;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { date, district, outlet, customerName, contactNumber, address, invoiceNumber, complaintText, items } = form;
      const { data } = await client.post("/complaints", {
        date,
        district,
        outlet,
        customerName,
        contactNumber,
        address,
        invoiceNumber,
        complaintText,
        items: items.map((it) => ({
          product: it.product,
          batchNo: Number(it.batchNo),
          quantity: it.quantity,
          code: Number(it.code),
        })),
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
                  setForm({ ...emptyForm, items: [newItem()] });
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
              <Field label="Invoice number" error={errors.invoiceNumber} hint="Covers every product below">
                <input
                  type="text"
                  placeholder="Invoice / bill number"
                  value={form.invoiceNumber}
                  onChange={update("invoiceNumber")}
                />
              </Field>

              <div className="items-list">
                {form.items.map((item, index) => {
                  const itemErr = errors.items?.[index] || {};
                  const quantityOptions = item.product ? QUANTITIES_BY_PRODUCT[item.product] || [] : [];
                  return (
                    <div className="item-row" key={item.uid}>
                      <div className="item-row-head">
                        <span className="item-number">Product {index + 1}</span>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            className="item-remove"
                            onClick={() => removeItem(index)}
                            aria-label={`Remove product ${index + 1}`}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-2">
                        <Field label="Product" error={itemErr.product}>
                          <select value={item.product} onChange={updateItem(index, "product")}>
                            <option value="">Select product</option>
                            {PRODUCTS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field
                          label="Quantity"
                          error={itemErr.quantity}
                          hint={!item.product ? "Select a product first" : undefined}
                        >
                          <select
                            value={item.quantity}
                            onChange={updateItem(index, "quantity")}
                            disabled={!item.product}
                          >
                            <option value="">
                              {item.product ? "Select quantity" : "Select a product first"}
                            </option>
                            {quantityOptions.map((q) => (
                              <option key={q} value={q}>
                                {q}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="grid grid-2">
                        <Field label="Batch no." error={itemErr.batchNo}>
                          <input
                            type="number"
                            placeholder="Batch number"
                            value={item.batchNo}
                            onChange={updateItem(index, "batchNo")}
                          />
                        </Field>
                        <Field label="Code" error={itemErr.code}>
                          <input
                            type="number"
                            placeholder="Code"
                            value={item.code}
                            onChange={updateItem(index, "code")}
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button type="button" className="btn btn-ghost add-item-btn" onClick={addItem}>
                + Add another product
              </button>
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
      .items-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-top: 18px;
      }
      .item-row {
        background: rgba(15, 138, 128, 0.05);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        padding: 16px 16px 4px;
      }
      .item-row-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .item-number {
        font-family: var(--font-mono);
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--teal-600);
      }
      .item-remove {
        border: none;
        background: none;
        color: var(--status-danger);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 4px 8px;
      }
      .item-remove:hover { text-decoration: underline; }
      .add-item-btn {
        margin-top: 4px;
        width: 100%;
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
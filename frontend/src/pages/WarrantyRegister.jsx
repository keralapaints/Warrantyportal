import { useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { DISTRICTS, OUTLETS_BY_DISTRICT, PRODUCTS, QUANTITIES_BY_PRODUCT, STATES } from "../data/options";

const todayISO = () => new Date().toISOString().slice(0, 10);
const YES_NO_UNKNOWN = ["Yes", "No", "Not Known"];

let itemUid = 0;
const newItem = (presetProduct = "") => ({
  uid: itemUid++,
  product: presetProduct,
  packSize: "",
  containers: "",
  batchNumbersText: "",
  shadeType: "",
});

const SURFACE_QUESTIONS = [
  { key: "waterLeakageBefore", label: "Known water leakage before painting?" },
  { key: "dampnessRisingDamp", label: "Known dampness / rising damp?" },
  { key: "structuralCracks", label: "Known structural cracks?" },
  { key: "loosePlaster", label: "Known loose / defective plaster?" },
  { key: "existingPeeling", label: "Existing peeling / flaking?" },
  { key: "efflorescence", label: "Efflorescence / salt deposits?" },
  { key: "fungusAlgae", label: "Fungus / algae?" },
  { key: "plumbingLeakage", label: "Plumbing leakage?" },
];

const DECLARATIONS = [
  { key: "infoAccurate", text: "I confirm that the information provided in this warranty registration is true and accurate to the best of my knowledge." },
  { key: "applicationAccurate", text: "I confirm that the registered product has been applied at the site stated above and that the application details provided are accurate to the best of my knowledge." },
  { key: "policyAccepted", text: "I have been provided access to and accept the Kerala Paints Master Warranty Policy and the Product-Specific Warranty Terms applicable to this product.", link: true },
  { key: "eligibilityUnderstood", text: "I understand that warranty eligibility is subject to the applicable product instructions, recommended painting system, surface conditions and warranty terms." },
  { key: "inspectionAccess", text: "In the event of a warranty claim, I agree to provide Kerala Paints reasonable access to inspect and investigate the affected area." },
  { key: "privacyConsent", text: "I acknowledge and consent to the Privacy Policy as legally applicable." },
];

const emptyForm = {
  customerName: "", mobileNumber: "", email: "", customerType: "", alternateMobile: "",
  siteName: "", houseNo: "", street: "", panchayat: "", siteDistrict: "", siteState: "Kerala",
  pincode: "", propertyType: "", paintingType: "", buildingAge: "",
  purchaseDate: todayISO(), invoiceNumber: "", purchaseState: "Kerala", purchaseDistrict: "", outlet: "",
  items: [newItem()],
  paintingStartDate: "", paintingCompletionDate: "", applicationArea: "", paintedAreaSqft: "", topcoats: "",
  applicationMethod: "", painterName: "", painterMobile: "",
  puttyUsed: "", puttyBrand: "", primerUsed: "", primerBrand: "", primerProductName: "", primerCoats: "",
  baseCoatUsed: "", baseCoatDetails: "",
  surfaceCondition: { waterLeakageBefore: "", dampnessRisingDamp: "", structuralCracks: "", loosePlaster: "", existingPeeling: "", efflorescence: "", fungusAlgae: "", plumbingLeakage: "" },
  declarations: { infoAccurate: false, applicationAccurate: false, policyAccepted: false, eligibilityUnderstood: false, inspectionAccess: false, privacyConsent: false, marketingConsent: false },
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

export default function WarrantyRegister() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateNested = (group, key) => (e) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.value } }));
  const updateCheck = (group, key) => (e) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.checked } }));

  function updatePurchaseDistrict(e) {
    setForm((f) => ({ ...f, purchaseDistrict: e.target.value, outlet: "" }));
  }

  function updateItem(index, key) {
    return (e) => {
      const value = e.target.value;
      setForm((f) => ({
        ...f,
        items: f.items.map((it, i) => {
          if (i !== index) return it;
          if (key === "product") return { ...it, product: value, packSize: "" };
          return { ...it, [key]: value };
        }),
      }));
    };
  }

  // "+ Add another product" — a fresh, fully blank line.
  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
  }

  // "+ Add pack size" on an existing row — same product, pre-filled, so the
  // customer doesn't have to re-pick the product for a second pack size of it.
  function addPackSizeFor(index) {
    setForm((f) => {
      const product = f.items[index].product;
      const copy = [...f.items];
      copy.splice(index + 1, 0, newItem(product));
      return { ...f, items: copy };
    });
  }

  function removeItem(index) {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  const outletOptions = form.purchaseDistrict ? OUTLETS_BY_DISTRICT[form.purchaseDistrict] || [] : [];

  function validate() {
    const e = {};
    if (form.customerName.trim().length < 2) e.customerName = "Enter your full name.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobileNumber.trim())) e.mobileNumber = "Enter a valid mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email.";
    if (!form.customerType) e.customerType = "Select a customer type.";

    if (!form.siteName.trim()) e.siteName = "Enter the site / building name.";
    if (!form.street.trim()) e.street = "Enter the street / locality.";
    if (!form.panchayat.trim()) e.panchayat = "Enter the panchayat / municipality / corporation.";
    if (!form.siteDistrict) e.siteDistrict = "Select the site district.";
    if (!form.siteState) e.siteState = "Select the site state.";
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter a 6-digit PIN code.";
    if (!form.propertyType) e.propertyType = "Select a property type.";
    if (!form.paintingType) e.paintingType = "Select new building or repainting.";

    if (!form.purchaseDate) e.purchaseDate = "Select the purchase date.";
    if (new Date(form.purchaseDate) > new Date()) e.purchaseDate = "Purchase date cannot be in the future.";
    if (!form.invoiceNumber.trim()) e.invoiceNumber = "Enter the invoice number.";
    if (!form.purchaseState) e.purchaseState = "Select the purchase state.";
    if (!form.purchaseDistrict) e.purchaseDistrict = "Select the purchase district.";
    if (!form.outlet) e.outlet = "Select the outlet.";

    const itemErrors = form.items.map((it) => {
      const ie = {};
      if (!it.product) ie.product = "Select a product.";
      if (!it.packSize) ie.packSize = "Select a pack size.";
      if (!it.containers || Number(it.containers) < 1) ie.containers = "Enter a positive number.";
      if (!it.batchNumbersText.trim()) ie.batchNumbersText = "Enter at least one batch number.";
      if (!it.shadeType) ie.shadeType = "Select a shade type.";
      return ie;
    });
    if (itemErrors.some((ie) => Object.keys(ie).length > 0)) e.items = itemErrors;

    if (!form.paintingStartDate) e.paintingStartDate = "Select the painting start date.";
    if (!form.paintingCompletionDate) e.paintingCompletionDate = "Select the completion date.";
    if (form.paintingStartDate && form.purchaseDate && form.paintingStartDate < form.purchaseDate) {
      e.paintingStartDate = "Cannot be before the purchase date.";
    }
    if (
      form.paintingCompletionDate &&
      form.paintingStartDate &&
      form.paintingCompletionDate < form.paintingStartDate
    ) {
      e.paintingCompletionDate = "Completion date cannot be before the painting start date.";
    }
    if (!form.applicationArea) e.applicationArea = "Select interior, exterior, or both.";
    if (!form.paintedAreaSqft || Number(form.paintedAreaSqft) <= 0) e.paintedAreaSqft = "Enter the painted area.";
    if (!form.topcoats || Number(form.topcoats) <= 0) e.topcoats = "Enter the number of topcoats.";
    if (!form.painterName.trim()) e.painterName = "Enter the painter / contractor name.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.painterMobile.trim())) e.painterMobile = "Enter a valid mobile number.";

    if (!form.puttyUsed) e.puttyUsed = "Select yes or no.";
    if (form.puttyUsed === "Yes" && !form.puttyBrand.trim()) e.puttyBrand = "Required since putty was used.";
    if (!form.primerUsed) e.primerUsed = "Select yes or no.";
    if (form.primerUsed === "Yes" && !form.primerBrand.trim()) e.primerBrand = "Required since primer was used.";
    if (form.primerUsed === "Yes" && !form.primerProductName.trim()) e.primerProductName = "Required since primer was used.";
    if (form.baseCoatUsed === "Yes" && !form.baseCoatDetails.trim()) e.baseCoatDetails = "Required since a base coat / sealer was used.";

    const surfaceErrors = {};
    for (const q of SURFACE_QUESTIONS) {
      if (!form.surfaceCondition[q.key]) surfaceErrors[q.key] = "Required.";
    }
    if (Object.keys(surfaceErrors).length > 0) e.surfaceCondition = surfaceErrors;

    const requiredDecls = ["infoAccurate", "applicationAccurate", "policyAccepted", "eligibilityUnderstood", "inspectionAccess", "privacyConsent"];
    if (requiredDecls.some((k) => !form.declarations[k])) e.declarations = "All mandatory declarations must be accepted.";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitError("");
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const { items, ...rest } = form;
      const payload = {
        ...rest,
        items: items.map((it) => ({
          product: it.product,
          packSize: it.packSize,
          containers: Number(it.containers),
          batchNumbers: it.batchNumbersText.split(",").map((s) => s.trim()).filter(Boolean),
          shadeType: it.shadeType,
        })),
      };
      const { data } = await client.post("/warranty/register", payload);
      setResult(data);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Could not register. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="page-shell">
        <div className="container narrow">
          <div className="glass-card confirm-card">
            <span className="eyebrow">Registration submitted</span>
            <h1>Application received</h1>
            <p className="confirm-copy">
              Your registration is under review. Keep this reference number — you'll need it
              along with your invoice number to file a claim once approved.
            </p>
            <div className="token-badge token-badge-lg">{result.token}</div>
            <p className="status-note">Status: {result.status.replace(/_/g, " ")}</p>
            <div className="confirm-actions">
              <Link className="btn btn-primary" to="/">
                Back to home
              </Link>
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
          <span className="eyebrow">Kerala Paints · Warranty</span>
          <h1>Register your warranty</h1>
          <p className="form-intro">
            Register within 15 days of purchase. All sections marked mandatory must be completed.
          </p>

          {submitError && <div className="submit-error top">{submitError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* --- Customer --- */}
            <div className="section">
              <h3>Customer</h3>
              <div className="grid grid-2">
                <Field label="Customer full name" error={errors.customerName}>
                  <input type="text" value={form.customerName} onChange={update("customerName")} />
                </Field>
                <Field label="Mobile number" error={errors.mobileNumber}>
                  <input type="tel" value={form.mobileNumber} onChange={update("mobileNumber")} />
                </Field>
              </div>
              <div className="grid grid-2">
                <Field label="Email ID" error={errors.email} hint="Registration confirmation is sent here">
                  <input type="email" value={form.email} onChange={update("email")} />
                </Field>
                <Field label="Customer type" error={errors.customerType}>
                  <select value={form.customerType} onChange={update("customerType")}>
                    <option value="">Select</option>
                    {["Owner", "Tenant", "Builder", "Contractor", "Institution", "Other"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Alternate mobile number" hint="Optional">
                <input type="tel" value={form.alternateMobile} onChange={update("alternateMobile")} />
              </Field>
            </div>

            {/* --- Site --- */}
            <div className="section">
              <h3>Site</h3>
              <Field label="Site / building name" error={errors.siteName}>
                <input type="text" value={form.siteName} onChange={update("siteName")} />
              </Field>
              <div className="grid grid-2">
                <Field label="House / building no." hint="Optional">
                  <input type="text" value={form.houseNo} onChange={update("houseNo")} />
                </Field>
                <Field label="Street / locality" error={errors.street}>
                  <input type="text" value={form.street} onChange={update("street")} />
                </Field>
              </div>
              <Field label="Panchayat / Municipality / Corporation" error={errors.panchayat}>
                <input type="text" value={form.panchayat} onChange={update("panchayat")} />
              </Field>
              <div className="grid grid-3">
                <Field label="State" error={errors.siteState}>
                  <select value={form.siteState} onChange={update("siteState")}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="District" error={errors.siteDistrict}>
                  <select value={form.siteDistrict} onChange={update("siteDistrict")}>
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="PIN code" error={errors.pincode}>
                  <input type="text" inputMode="numeric" maxLength={6} value={form.pincode} onChange={update("pincode")} />
                </Field>
              </div>
              <div className="grid grid-3">
                <Field label="Property type" error={errors.propertyType}>
                  <select value={form.propertyType} onChange={update("propertyType")}>
                    <option value="">Select</option>
                    {["Residential", "Apartment", "Commercial", "Institutional", "Industrial", "Other"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Painting type" error={errors.paintingType}>
                  <select value={form.paintingType} onChange={update("paintingType")}>
                    <option value="">Select</option>
                    <option value="New Building">New Building</option>
                    <option value="Repainting">Repainting</option>
                  </select>
                </Field>
                <Field label="Approx. building age" hint="Optional, years">
                  <input type="number" min="0" value={form.buildingAge} onChange={update("buildingAge")} />
                </Field>
              </div>
            </div>

            {/* --- Purchase --- */}
            <div className="section">
              <h3>Purchase</h3>
              <div className="grid grid-2">
                <Field label="Purchase date" error={errors.purchaseDate}>
                  <input type="date" value={form.purchaseDate} onChange={update("purchaseDate")} max={todayISO()} />
                </Field>
                <Field label="Invoice number" error={errors.invoiceNumber}>
                  <input type="text" value={form.invoiceNumber} onChange={update("invoiceNumber")} />
                </Field>
              </div>
              <div className="grid grid-3">
                <Field label="Purchase state" error={errors.purchaseState}>
                  <select value={form.purchaseState} onChange={update("purchaseState")}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Purchase district" error={errors.purchaseDistrict}>
                  <select value={form.purchaseDistrict} onChange={updatePurchaseDistrict}>
                    <option value="">Select district</option>
                    {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Outlet / dealer" error={errors.outlet} hint={!form.purchaseDistrict ? "Select a district first" : undefined}>
                  <select value={form.outlet} onChange={update("outlet")} disabled={!form.purchaseDistrict}>
                    <option value="">{form.purchaseDistrict ? "Select outlet" : "Select a district first"}</option>
                    {outletOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* --- Product --- */}
            <div className="section">
              <h3>Products purchased</h3>
              <div className="items-list">
                {form.items.map((item, index) => {
                  const ie = errors.items?.[index] || {};
                  const packOptions = item.product ? QUANTITIES_BY_PRODUCT[item.product] || [] : [];
                  return (
                    <div className="item-row" key={item.uid}>
                      <div className="item-row-head">
                        <span className="item-number">Product {index + 1}</span>
                        {form.items.length > 1 && (
                          <button type="button" className="item-remove" onClick={() => removeItem(index)}>Remove</button>
                        )}
                      </div>
                      <div className="grid grid-2">
                        <Field label="Product name" error={ie.product}>
                          <select value={item.product} onChange={updateItem(index, "product")}>
                            <option value="">Select product</option>
                            {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </Field>
                        <Field label="Pack size" error={ie.packSize} hint={!item.product ? "Select a product first" : undefined}>
                          <select value={item.packSize} onChange={updateItem(index, "packSize")} disabled={!item.product}>
                            <option value="">{item.product ? "Select pack size" : "Select a product first"}</option>
                            {packOptions.map((q) => <option key={q} value={q}>{q}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div className="grid grid-2">
                        <Field label="Number of containers" error={ie.containers}>
                          <input type="number" min="1" value={item.containers} onChange={updateItem(index, "containers")} />
                        </Field>
                        <Field label="Shade type" error={ie.shadeType}>
                          <select value={item.shadeType} onChange={updateItem(index, "shadeType")}>
                            <option value="">Select</option>
                            <option value="White">White</option>
                            <option value="Tinted Shade">Tinted Shade</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Batch number(s)" error={ie.batchNumbersText} hint="Separate multiple batch numbers with commas">
                        <input type="text" placeholder="e.g. B4471, B4472" value={item.batchNumbersText} onChange={updateItem(index, "batchNumbersText")} />
                      </Field>

                      {item.product && (
                        <button
                          type="button"
                          className="add-packsize-btn"
                          onClick={() => addPackSizeFor(index)}
                        >
                          + Add pack size for {item.product}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="btn btn-ghost add-item-btn" onClick={addItem}>
                + Add another product
              </button>
            </div>

            {/* --- Application --- */}
            <div className="section">
              <h3>Application</h3>
              <div className="grid grid-2">
                <Field label="Painting start date" error={errors.paintingStartDate}>
                  <input type="date" value={form.paintingStartDate} onChange={update("paintingStartDate")} min={form.purchaseDate} />
                </Field>
                <Field label="Painting completion date" error={errors.paintingCompletionDate}>
                  <input type="date" value={form.paintingCompletionDate} onChange={update("paintingCompletionDate")} min={form.paintingStartDate || form.purchaseDate} />
                </Field>
              </div>
              <div className="grid grid-3">
                <Field label="Application area" error={errors.applicationArea}>
                  <select value={form.applicationArea} onChange={update("applicationArea")}>
                    <option value="">Select</option>
                    <option value="Interior">Interior</option>
                    <option value="Exterior">Exterior</option>
                    <option value="Both">Both</option>
                  </select>
                </Field>
                <Field label="Approx. painted area (sqft)" error={errors.paintedAreaSqft}>
                  <input type="number" min="1" value={form.paintedAreaSqft} onChange={update("paintedAreaSqft")} />
                </Field>
                <Field label="Number of topcoats" error={errors.topcoats}>
                  <input type="number" min="1" value={form.topcoats} onChange={update("topcoats")} />
                </Field>
              </div>
              <Field label="Application method" hint="Recommended">
                <select value={form.applicationMethod} onChange={update("applicationMethod")}>
                  <option value="">Select</option>
                  <option value="Brush">Brush</option>
                  <option value="Roller">Roller</option>
                  <option value="Spray">Spray</option>
                  <option value="Combination">Combination</option>
                </select>
              </Field>
              <div className="grid grid-2">
                <Field label="Painter / contractor name" error={errors.painterName}>
                  <input type="text" value={form.painterName} onChange={update("painterName")} />
                </Field>
                <Field label="Painter / contractor mobile" error={errors.painterMobile}>
                  <input type="tel" value={form.painterMobile} onChange={update("painterMobile")} />
                </Field>
              </div>
            </div>

            {/* --- Painting system --- */}
            <div className="section">
              <h3>Painting system used</h3>
              <div className="grid grid-2">
                <Field label="Putty used?" error={errors.puttyUsed}>
                  <select value={form.puttyUsed} onChange={update("puttyUsed")}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </Field>
                {form.puttyUsed === "Yes" && (
                  <Field label="Putty brand" error={errors.puttyBrand}>
                    <input type="text" value={form.puttyBrand} onChange={update("puttyBrand")} />
                  </Field>
                )}
              </div>
              <div className="grid grid-2">
                <Field label="Primer used?" error={errors.primerUsed}>
                  <select value={form.primerUsed} onChange={update("primerUsed")}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </Field>
                <Field label="Number of primer coats" hint="Recommended">
                  <input type="number" min="0" value={form.primerCoats} onChange={update("primerCoats")} />
                </Field>
              </div>
              {form.primerUsed === "Yes" && (
                <div className="grid grid-2">
                  <Field label="Primer brand" error={errors.primerBrand}>
                    <input type="text" value={form.primerBrand} onChange={update("primerBrand")} />
                  </Field>
                  <Field label="Primer product name" error={errors.primerProductName}>
                    <input type="text" value={form.primerProductName} onChange={update("primerProductName")} />
                  </Field>
                </div>
              )}
              <div className="grid grid-2">
                <Field label="Base coat / sealer used?" hint="Recommended">
                  <select value={form.baseCoatUsed} onChange={update("baseCoatUsed")}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </Field>
                {form.baseCoatUsed === "Yes" && (
                  <Field label="Base coat / sealer details" error={errors.baseCoatDetails}>
                    <input type="text" value={form.baseCoatDetails} onChange={update("baseCoatDetails")} />
                  </Field>
                )}
              </div>
            </div>

            {/* --- Surface condition --- */}
            <div className="section">
              <h3>Surface condition before painting</h3>
              <div className="surface-grid">
                {SURFACE_QUESTIONS.map((q) => (
                  <Field key={q.key} label={q.label} error={errors.surfaceCondition?.[q.key]}>
                    <select value={form.surfaceCondition[q.key]} onChange={updateNested("surfaceCondition", q.key)}>
                      <option value="">Select</option>
                      {YES_NO_UNKNOWN.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </Field>
                ))}
              </div>
            </div>

            {/* --- Declarations --- */}
            <div className="section">
              <h3>Declarations</h3>
              <div className="declarations-list">
                {DECLARATIONS.map((d) => (
                  <label className="decl-row" key={d.key}>
                    <input type="checkbox" checked={form.declarations[d.key]} onChange={updateCheck("declarations", d.key)} />
                    <span>
                      {d.text}
                      {d.link && (
                        <>
                          {" "}
                          <Link to="/warranty-policy" target="_blank" className="policy-link">
                            View policy
                          </Link>
                        </>
                      )}
                    </span>
                  </label>
                ))}
                <label className="decl-row optional">
                  <input type="checkbox" checked={form.declarations.marketingConsent} onChange={updateCheck("declarations", "marketingConsent")} />
                  <span>I'd like to receive promotional and marketing communication. (Optional)</span>
                </label>
              </div>
              {errors.declarations && <div className="error-text" style={{ marginTop: 10 }}>{errors.declarations}</div>}
            </div>

            {submitError && <div className="submit-error">{submitError}</div>}

            <div className="form-actions">
              <Link to="/" className="track-link">← Back to home</Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit registration"}
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
      .page-shell { min-height: 100vh; padding: 56px 0 80px; display: flex; align-items: flex-start; justify-content: center; }
      .container.narrow { max-width: 760px; }
      .form-card, .confirm-card { padding: 40px 36px 36px; }
      .form-card h1, .confirm-card h1 { font-size: 27px; margin-top: 6px; }
      .form-intro, .confirm-copy { color: var(--ink-muted); margin-top: 10px; font-size: 14px; line-height: 1.55; }
      .status-note { margin-top: 10px; font-size: 13px; color: var(--ink-muted); font-family: var(--font-mono); text-transform: capitalize; }
      .section { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line); }
      .section:first-of-type { border-top: none; margin-top: 24px; }
      .section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-600); margin-bottom: 16px; }
      .grid { display: grid; gap: 14px; margin-bottom: 14px; }
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .field select:disabled { opacity: 0.6; }
      .field .hint { font-size: 12px; color: var(--ink-muted); }
      .items-list { display: flex; flex-direction: column; gap: 16px; }
      .item-row { background: rgba(15,138,128,0.05); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px 16px 4px; }
      .item-row-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .item-number { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--teal-600); }
      .item-remove { border: none; background: none; color: var(--status-danger); font-size: 12px; font-weight: 600; cursor: pointer; }
      .add-item-btn { margin-top: 16px; width: 100%; }
      .add-packsize-btn {
        border: none; background: none; color: var(--teal-600); font-size: 12px; font-weight: 600;
        cursor: pointer; padding: 8px 0 12px; text-align: left;
      }
      .add-packsize-btn:hover { text-decoration: underline; }
      .surface-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .declarations-list { display: flex; flex-direction: column; gap: 10px; }
      .decl-row { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.5; background: #fff; border: 1px solid var(--line); border-radius: 9px; padding: 12px 14px; cursor: pointer; }
      .decl-row.optional { background: rgba(15,138,128,0.04); }
      .decl-row input { margin-top: 3px; }
      .policy-link { color: var(--teal-600); font-weight: 600; }
      .form-actions { margin-top: 30px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .track-link { font-size: 13.5px; color: var(--teal-600); font-weight: 600; text-decoration: none; }
      .submit-error { margin-top: 20px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 12px 14px; font-size: 13.5px; font-weight: 500; }
      .submit-error.top { margin-top: 16px; margin-bottom: 0; }
      .token-badge-lg { font-size: 19px; padding: 12px 22px; margin: 18px 0 12px; }
      .confirm-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
      @media (max-width: 640px) {
        .grid-2, .grid-3, .surface-grid { grid-template-columns: 1fr; }
        .form-card, .confirm-card { padding: 28px 20px 24px; }
      }
    `}</style>
  );
}
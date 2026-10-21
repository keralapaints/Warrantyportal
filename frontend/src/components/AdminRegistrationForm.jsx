import { useState } from "react";
import client from "../api/client";
import {
  DISTRICTS_BY_STATE,
  OUTLETS_BY_DISTRICT,
  PRODUCTS,
  QUANTITIES_BY_PRODUCT,
  WARRANTY_YEARS_BY_PRODUCT,
  STATES,
} from "../data/options";

const todayISO = () => new Date().toISOString().slice(0, 10);
const YES_NO_UNKNOWN = ["Yes", "No", "Not Known"];
const STATUS_OPTIONS = ["SUBMITTED", "UNDER_VERIFICATION", "APPROVED", "WARRANTY_ISSUED", "REJECTED", "CANCELLED"];

let itemUid = 0;
const newItem = (presetProduct = "") => ({
  uid: itemUid++,
  product: presetProduct,
  packSize: "",
  containers: "",
  batchNumbersText: "",
  shadeType: "",
});

let appUid = 0;
const newApplication = () => ({
  uid: appUid++,
  paintingStartDate: "",
  paintingCompletionDate: "",
  applicationArea: "",
  paintedAreaSqft: "",
  topcoats: "",
  applicationMethod: "",
  painterName: "",
  painterMobile: "",
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
  { key: "infoAccurate", text: "Information provided is true and accurate." },
  { key: "applicationAccurate", text: "Application details are accurate." },
  { key: "policyAccepted", text: "Master Warranty Policy and Product-Specific Terms accepted." },
  { key: "eligibilityUnderstood", text: "Customer understands eligibility conditions." },
  { key: "inspectionAccess", text: "Customer agrees to provide inspection access if claimed." },
  { key: "privacyConsent", text: "Privacy Policy acknowledged." },
];

function toDateInput(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    status: "SUBMITTED",
    customerName: "", mobileNumber: "", email: "", customerType: "", alternateMobile: "",
    siteName: "", houseNo: "", street: "", panchayat: "", siteDistrict: "", siteState: "Kerala",
    pincode: "", propertyType: "", paintingType: "", buildingAge: "",
    purchaseDate: todayISO(), invoiceNumber: "", purchaseState: "Kerala", purchaseDistrict: "", outlet: "",
    items: [newItem()],
    applications: [newApplication()],
    puttyUsed: "", puttyBrand: "", primerUsed: "", primerBrand: "", primerProductName: "", primerCoats: "",
    baseCoatUsed: "", baseCoatDetails: "",
    surfaceCondition: { waterLeakageBefore: "", dampnessRisingDamp: "", structuralCracks: "", loosePlaster: "", existingPeeling: "", efflorescence: "", fungusAlgae: "", plumbingLeakage: "" },
    declarations: { infoAccurate: false, applicationAccurate: false, policyAccepted: false, eligibilityUnderstood: false, inspectionAccess: false, privacyConsent: false, marketingConsent: false },
  };
}

// Converts a registration object from the server into this form's editable
// shape (uid-tagged items/applications, batch numbers joined into text).
function fromRegistration(r) {
  return {
    status: r.status || "SUBMITTED",
    customerName: r.customerName || "", mobileNumber: r.mobileNumber || "", email: r.email || "",
    customerType: r.customerType || "", alternateMobile: r.alternateMobile || "",
    siteName: r.siteName || "", houseNo: r.houseNo || "", street: r.street || "", panchayat: r.panchayat || "",
    siteDistrict: r.siteDistrict || "", siteState: r.siteState || "Kerala",
    pincode: r.pincode || "", propertyType: r.propertyType || "", paintingType: r.paintingType || "",
    buildingAge: r.buildingAge ?? "",
    purchaseDate: toDateInput(r.purchaseDate) || todayISO(),
    invoiceNumber: r.invoiceNumber || "", purchaseState: r.purchaseState || "Kerala",
    purchaseDistrict: r.purchaseDistrict || "", outlet: r.outlet || "",
    items: (r.items && r.items.length > 0
      ? r.items.map((it) => ({
          uid: itemUid++,
          product: it.product || "",
          packSize: it.packSize || "",
          containers: it.containers ?? "",
          batchNumbersText: (it.batchNumbers || []).join(", "),
          shadeType: it.shadeType || "",
        }))
      : [newItem()]),
    applications: (r.applications && r.applications.length > 0
      ? r.applications.map((a) => ({
          uid: appUid++,
          paintingStartDate: toDateInput(a.paintingStartDate),
          paintingCompletionDate: toDateInput(a.paintingCompletionDate),
          applicationArea: a.applicationArea || "",
          paintedAreaSqft: a.paintedAreaSqft ?? "",
          topcoats: a.topcoats ?? "",
          applicationMethod: a.applicationMethod || "",
          painterName: a.painterName || "",
          painterMobile: a.painterMobile || "",
        }))
      : [newApplication()]),
    puttyUsed: r.puttyUsed || "", puttyBrand: r.puttyBrand || "",
    primerUsed: r.primerUsed || "", primerBrand: r.primerBrand || "", primerProductName: r.primerProductName || "",
    primerCoats: r.primerCoats ?? "", baseCoatUsed: r.baseCoatUsed || "", baseCoatDetails: r.baseCoatDetails || "",
    surfaceCondition: {
      waterLeakageBefore: r.surfaceCondition?.waterLeakageBefore || "",
      dampnessRisingDamp: r.surfaceCondition?.dampnessRisingDamp || "",
      structuralCracks: r.surfaceCondition?.structuralCracks || "",
      loosePlaster: r.surfaceCondition?.loosePlaster || "",
      existingPeeling: r.surfaceCondition?.existingPeeling || "",
      efflorescence: r.surfaceCondition?.efflorescence || "",
      fungusAlgae: r.surfaceCondition?.fungusAlgae || "",
      plumbingLeakage: r.surfaceCondition?.plumbingLeakage || "",
    },
    declarations: {
      infoAccurate: !!r.declarations?.infoAccurate,
      applicationAccurate: !!r.declarations?.applicationAccurate,
      policyAccepted: !!r.declarations?.policyAccepted,
      eligibilityUnderstood: !!r.declarations?.eligibilityUnderstood,
      inspectionAccess: !!r.declarations?.inspectionAccess,
      privacyConsent: !!r.declarations?.privacyConsent,
      marketingConsent: !!r.declarations?.marketingConsent,
    },
  };
}

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

export default function AdminRegistrationForm({ mode, initialData, registrationId, onSaved, onCancel }) {
  const [form, setForm] = useState(() => (mode === "edit" && initialData ? fromRegistration(initialData) : emptyForm()));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const updateNested = (group, key) => (e) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.value } }));
  const updateCheck = (group, key) => (e) =>
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: e.target.checked } }));

  function updateSiteState(e) {
    setForm((f) => ({ ...f, siteState: e.target.value, siteDistrict: "" }));
  }
  function updatePurchaseState(e) {
    setForm((f) => ({ ...f, purchaseState: e.target.value, purchaseDistrict: "", outlet: "" }));
  }
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
  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
  }
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

  function updateApplication(index, key) {
    return (e) => {
      const value = e.target.value;
      setForm((f) => ({
        ...f,
        applications: f.applications.map((a, i) => (i === index ? { ...a, [key]: value } : a)),
      }));
    };
  }
  function addApplication() {
    setForm((f) => ({ ...f, applications: [...f.applications, newApplication()] }));
  }
  function removeApplication(index) {
    setForm((f) => ({ ...f, applications: f.applications.filter((_, i) => i !== index) }));
  }

  const siteDistrictOptions = form.siteState ? DISTRICTS_BY_STATE[form.siteState] || [] : [];
  const purchaseDistrictOptions = form.purchaseState ? DISTRICTS_BY_STATE[form.purchaseState] || [] : [];
  const outletOptions = form.purchaseDistrict ? OUTLETS_BY_DISTRICT[form.purchaseDistrict] || [] : [];

  function validate() {
    const e = {};
    if (form.customerName.trim().length < 2) e.customerName = "Enter the customer's full name.";
    if (!/^[0-9+\-\s]{7,15}$/.test(form.mobileNumber.trim())) e.mobileNumber = "Enter a valid mobile number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Enter a valid email.";
    if (!form.customerType) e.customerType = "Select a customer type.";

    if (!form.siteName.trim()) e.siteName = "Enter the site / building name.";
    if (!form.street.trim()) e.street = "Enter the street / locality.";
    if (!form.panchayat.trim()) e.panchayat = "Enter the panchayat / municipality / corporation.";
    if (!form.siteState) e.siteState = "Select the site state.";
    if (!form.siteDistrict) e.siteDistrict = "Select the site district.";
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter a 6-digit PIN code.";
    if (!form.propertyType) e.propertyType = "Select a property type.";
    if (!form.paintingType) e.paintingType = "Select new building or repainting.";

    if (!form.purchaseDate) e.purchaseDate = "Select the purchase date.";
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

    const appErrors = form.applications.map((a) => {
      const ae = {};
      if (!a.paintingStartDate) ae.paintingStartDate = "Select the painting start date.";
      if (!a.paintingCompletionDate) ae.paintingCompletionDate = "Select the completion date.";
      if (a.paintingCompletionDate && a.paintingStartDate && a.paintingCompletionDate < a.paintingStartDate) {
        ae.paintingCompletionDate = "Cannot be before the painting start date.";
      }
      if (!a.applicationArea) ae.applicationArea = "Select interior or exterior.";
      if (!a.paintedAreaSqft || Number(a.paintedAreaSqft) <= 0) ae.paintedAreaSqft = "Enter the painted area.";
      if (!a.topcoats || Number(a.topcoats) <= 0) ae.topcoats = "Enter the number of topcoats.";
      if (!a.painterName.trim()) ae.painterName = "Enter the painter / contractor name.";
      if (!/^[0-9+\-\s]{7,15}$/.test(a.painterMobile.trim())) ae.painterMobile = "Enter a valid mobile number.";
      return ae;
    });
    if (appErrors.some((ae) => Object.keys(ae).length > 0)) e.applications = appErrors;

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
      const { items, applications, ...rest } = form;
      const payload = {
        ...rest,
        items: items.map((it) => ({
          product: it.product,
          packSize: it.packSize,
          containers: Number(it.containers),
          batchNumbers: it.batchNumbersText.split(",").map((s) => s.trim()).filter(Boolean),
          shadeType: it.shadeType,
        })),
        applications: applications.map((a) => ({
          paintingStartDate: a.paintingStartDate,
          paintingCompletionDate: a.paintingCompletionDate,
          applicationArea: a.applicationArea,
          paintedAreaSqft: Number(a.paintedAreaSqft),
          topcoats: Number(a.topcoats),
          applicationMethod: a.applicationMethod,
          painterName: a.painterName,
          painterMobile: a.painterMobile,
        })),
      };

      const { data } =
        mode === "edit"
          ? await client.patch(`/warranty/${registrationId}`, payload)
          : await client.post("/warranty", payload);

     onSaved(data.registration, data.approvalEmail);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Could not save. Please try again.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="admin-form-shell">
      <div className="admin-form-head">
        <h2>{mode === "edit" ? "Edit registration" : "New registration"}</h2>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {submitError && <div className="submit-error top">{submitError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="section">
          <h3>Status</h3>
          <Field label="Registration status">
            <select value={form.status} onChange={update("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Field>
        </div>

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
            <Field label="Email ID" error={errors.email}>
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
              <select value={form.siteState} onChange={updateSiteState}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="District" error={errors.siteDistrict} hint={!form.siteState ? "Select a state first" : undefined}>
              <select value={form.siteDistrict} onChange={update("siteDistrict")} disabled={!form.siteState}>
                <option value="">{form.siteState ? "Select district" : "Select a state first"}</option>
                {siteDistrictOptions.map((d) => <option key={d} value={d}>{d}</option>)}
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

        <div className="section">
          <h3>Purchase</h3>
          <div className="grid grid-2">
            <Field label="Purchase date" error={errors.purchaseDate}>
              <input type="date" value={form.purchaseDate} onChange={update("purchaseDate")} />
            </Field>
            <Field label="Invoice number" error={errors.invoiceNumber}>
              <input type="text" value={form.invoiceNumber} onChange={update("invoiceNumber")} />
            </Field>
          </div>
          <div className="grid grid-3">
            <Field label="Purchase state" error={errors.purchaseState}>
              <select value={form.purchaseState} onChange={updatePurchaseState}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Purchase district" error={errors.purchaseDistrict} hint={!form.purchaseState ? "Select a state first" : undefined}>
              <select value={form.purchaseDistrict} onChange={updatePurchaseDistrict} disabled={!form.purchaseState}>
                <option value="">{form.purchaseState ? "Select district" : "Select a state first"}</option>
                {purchaseDistrictOptions.map((d) => <option key={d} value={d}>{d}</option>)}
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

        <div className="section">
          <h3>Products purchased</h3>
          <div className="items-list">
            {form.items.map((item, index) => {
              const ie = errors.items?.[index] || {};
              const packOptions = item.product ? QUANTITIES_BY_PRODUCT[item.product] || [] : [];
              const warrantyLabel = item.product ? WARRANTY_YEARS_BY_PRODUCT[item.product] : "";
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
                  {warrantyLabel && (
                    <div className="warranty-chip">Warranty on this product: <strong>{warrantyLabel}</strong></div>
                  )}
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
                  <Field label="Batch number(s)" error={ie.batchNumbersText} hint="Comma-separated">
                    <input type="text" value={item.batchNumbersText} onChange={updateItem(index, "batchNumbersText")} />
                  </Field>
                  {item.product && (
                    <button type="button" className="add-packsize-btn" onClick={() => addPackSizeFor(index)}>
                      + Add pack size for {item.product}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-ghost add-item-btn" onClick={addItem}>+ Add another product</button>
        </div>

        <div className="section">
          <h3>Application</h3>
          <div className="items-list">
            {form.applications.map((app, index) => {
              const ae = errors.applications?.[index] || {};
              return (
                <div className="item-row" key={app.uid}>
                  <div className="item-row-head">
                    <span className="item-number">Application {index + 1}</span>
                    {form.applications.length > 1 && (
                      <button type="button" className="item-remove" onClick={() => removeApplication(index)}>Remove</button>
                    )}
                  </div>
                  <div className="grid grid-2">
                    <Field label="Painting start date" error={ae.paintingStartDate}>
                      <input type="date" value={app.paintingStartDate} onChange={updateApplication(index, "paintingStartDate")} />
                    </Field>
                    <Field label="Painting completion date" error={ae.paintingCompletionDate}>
                      <input type="date" value={app.paintingCompletionDate} onChange={updateApplication(index, "paintingCompletionDate")} />
                    </Field>
                  </div>
                  <div className="grid grid-3">
                    <Field label="Application area" error={ae.applicationArea}>
                      <select value={app.applicationArea} onChange={updateApplication(index, "applicationArea")}>
                        <option value="">Select</option>
                        <option value="Interior">Interior</option>
                        <option value="Exterior">Exterior</option>
                      </select>
                    </Field>
                    <Field label="Approx. painted area (sqft)" error={ae.paintedAreaSqft}>
                      <input type="number" min="1" value={app.paintedAreaSqft} onChange={updateApplication(index, "paintedAreaSqft")} />
                    </Field>
                    <Field label="Number of topcoats" error={ae.topcoats}>
                      <input type="number" min="1" value={app.topcoats} onChange={updateApplication(index, "topcoats")} />
                    </Field>
                  </div>
                  <Field label="Application method" hint="Recommended">
                    <select value={app.applicationMethod} onChange={updateApplication(index, "applicationMethod")}>
                      <option value="">Select</option>
                      <option value="Brush">Brush</option>
                      <option value="Roller">Roller</option>
                      <option value="Spray">Spray</option>
                      <option value="Combination">Combination</option>
                    </select>
                  </Field>
                  <div className="grid grid-2">
                    <Field label="Painter / contractor name" error={ae.painterName}>
                      <input type="text" value={app.painterName} onChange={updateApplication(index, "painterName")} />
                    </Field>
                    <Field label="Painter / contractor mobile" error={ae.painterMobile}>
                      <input type="tel" value={app.painterMobile} onChange={updateApplication(index, "painterMobile")} />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn-ghost add-item-btn" onClick={addApplication}>+ Add another application</button>
        </div>

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

        <div className="section">
          <h3>Declarations</h3>
          <div className="declarations-list">
            {DECLARATIONS.map((d) => (
              <label className="decl-row" key={d.key}>
                <input type="checkbox" checked={form.declarations[d.key]} onChange={updateCheck("declarations", d.key)} />
                <span>{d.text}</span>
              </label>
            ))}
            <label className="decl-row optional">
              <input type="checkbox" checked={form.declarations.marketingConsent} onChange={updateCheck("declarations", "marketingConsent")} />
              <span>Marketing communication consent. (Optional)</span>
            </label>
          </div>
          {errors.declarations && <div className="error-text" style={{ marginTop: 10 }}>{errors.declarations}</div>}
        </div>

        {submitError && <div className="submit-error">{submitError}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : mode === "edit" ? "Save changes" : "Create registration"}
          </button>
        </div>
      </form>

      <AdminFormStyles />
    </div>
  );
}

function AdminFormStyles() {
  return (
    <style>{`
      .admin-form-shell { margin-top: 22px; background: rgba(255,255,255,0.5); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 28px 30px; }
      .admin-form-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .admin-form-head h2 { font-size: 20px; }
      .section { margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--line); }
      .section:first-of-type { border-top: none; margin-top: 16px; }
      .section h3 { font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--teal-600); margin-bottom: 14px; }
      .grid { display: grid; gap: 14px; margin-bottom: 14px; }
      .grid-2 { grid-template-columns: 1fr 1fr; }
      .grid-3 { grid-template-columns: 1fr 1fr 1fr; }
      .field select:disabled { opacity: 0.6; }
      .field .hint { font-size: 12px; color: var(--ink-muted); }
      .items-list { display: flex; flex-direction: column; gap: 14px; }
      .item-row { background: rgba(15,138,128,0.05); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 14px 14px 2px; }
      .item-row-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .item-number { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--teal-600); }
      .item-remove { border: none; background: none; color: var(--status-danger); font-size: 12px; font-weight: 600; cursor: pointer; }
      .add-item-btn { margin-top: 14px; width: 100%; }
      .add-packsize-btn { border: none; background: none; color: var(--teal-600); font-size: 12px; font-weight: 600; cursor: pointer; padding: 6px 0 10px; text-align: left; }
      .warranty-chip { display: inline-block; margin: -4px 0 12px; padding: 5px 11px; border-radius: 999px; background: rgba(15,138,128,0.12); color: var(--teal-600); font-size: 11.5px; font-weight: 600; }
      .surface-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .declarations-list { display: flex; flex-direction: column; gap: 8px; }
      .decl-row { display: flex; align-items: flex-start; gap: 10px; font-size: 12.5px; line-height: 1.5; background: #fff; border: 1px solid var(--line); border-radius: 9px; padding: 10px 12px; cursor: pointer; }
      .decl-row.optional { background: rgba(15,138,128,0.04); }
      .form-actions { margin-top: 26px; display: flex; justify-content: space-between; gap: 14px; padding-top: 18px; border-top: 1px solid var(--line); }
      .submit-error { margin-top: 18px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 13px; font-size: 13px; font-weight: 500; }
      .submit-error.top { margin-bottom: 0; }
      @media (max-width: 720px) {
        .grid-2, .grid-3, .surface-grid { grid-template-columns: 1fr; }
        .admin-form-shell { padding: 20px 16px; }
      }
    `}</style>
  );
}
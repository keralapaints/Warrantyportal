import { useEffect, useMemo, useState, useCallback } from "react";
import client, { fileUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StaffPanel from "../components/StaffPanel.jsx";
import AdminRegistrationForm from "../components/AdminRegistrationForm.jsx";

const COLUMNS = [
  { key: "new", label: "New" },
  { key: "assigned", label: "Assigned" },
  { key: "review", label: "In Review" },
  { key: "pending", label: "Pending" },
  { key: "solved", label: "Solved" },
];

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function productSummary(items) {
  if (!items || items.length === 0) return "";
  if (items.length === 1) return items[0].product;
  return `${items[0].product} +${items.length - 1} more`;
}

export default function AdminDashboard() {
  const { name, logout } = useAuth();
  const [view, setView] = useState("complaints"); // complaints | registrations | activity

  const [complaints, setComplaints] = useState([]);
  const [counts, setCounts] = useState({ new: 0, assigned: 0, review: 0, pending: 0, solved: 0, total: 0 });
  const [managers, setManagers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [mobileTab, setMobileTab] = useState("new");
  const [busyId, setBusyId] = useState(null);
  const [staffPanelOpen, setStaffPanelOpen] = useState(false);

  const load = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError("");
    try {
      const [listRes, countsRes, managersRes] = await Promise.all([
        client.get("/complaints", { params: searchTerm ? { search: searchTerm } : {} }),
        client.get("/complaints/counts"),
        client.get("/auth/staff", { params: { role: "manager" } }),
      ]);
      setComplaints(listRes.data);
      setCounts(countsRes.data);
      setManagers(managersRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "complaints") load();
  }, [load, view]);

  useEffect(() => {
    if (view !== "complaints") return;
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, view]);

  const grouped = useMemo(() => {
    const g = { new: [], assigned: [], review: [], pending: [], solved: [] };
    for (const c of complaints) g[c.status]?.push(c);
    return g;
  }, [complaints]);

  async function assign(id, managerId) {
    if (!managerId) return;
    setBusyId(id);
    try {
      const { data } = await client.patch(`/complaints/${id}/assign`, { managerId });
      setComplaints((list) => list.map((c) => (c._id === id ? data : c)));
      setCounts((prev) => ({ ...prev, new: Math.max(0, prev.new - 1), assigned: prev.assigned + 1 }));
      setSelected((sel) => (sel && sel._id === id ? data : sel));
    } catch (err) {
      setError(err.response?.data?.message || "Could not assign the complaint.");
    } finally {
      setBusyId(null);
    }
  }

  async function decide(id, status) {
    setBusyId(id);
    try {
      const { data } = await client.patch(`/complaints/${id}/status`, { status });
      setComplaints((list) => list.map((c) => (c._id === id ? data : c)));
      load(search);
      setSelected((sel) => (sel && sel._id === id ? data : sel));
    } catch (err) {
      setError(err.response?.data?.message || "Could not update status.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="container header-inner">
          <div>
            <span className="eyebrow">Kerala Paints · Admin</span>
            <h1>Complaint Desk</h1>
          </div>
          <div className="header-right">
            {view === "complaints" && (
              <input
                className="search-input"
                type="text"
                placeholder="Search token, name, phone, invoice…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
            <button className="btn btn-ghost" onClick={() => setStaffPanelOpen(true)}>
              Manage Staff
            </button>
            <span className="admin-name">{name}</span>
            <button className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="view-switch">
          <button
            className={`view-pill ${view === "complaints" ? "active" : ""}`}
            onClick={() => setView("complaints")}
          >
            Complaints
          </button>
          <button
            className={`view-pill ${view === "registrations" ? "active" : ""}`}
            onClick={() => setView("registrations")}
          >
            Warranty Registrations
          </button>
          <button
            className={`view-pill ${view === "activity" ? "active" : ""}`}
            onClick={() => setView("activity")}
          >
            Activity Log
          </button>
        </div>

        {view === "registrations" ? (
          <RegistrationsPanel />
        ) : view === "activity" ? (
          <ActivityLogPanel />
        ) : (
          <>
            <div className="summary-row">
              {COLUMNS.map((col) => (
                <div className={`summary-chip ${col.key}`} key={col.key}>
                  <span className="dot" />
                  {col.label} <strong>{counts[col.key] ?? 0}</strong>
                </div>
              ))}
              <div className="summary-chip total">
                Total <strong>{counts.total ?? 0}</strong>
              </div>
            </div>

            {error && <div className="dash-error">{error}</div>}

            <div className="mobile-tabs">
              {COLUMNS.map((col) => (
                <button
                  key={col.key}
                  className={`mobile-tab ${mobileTab === col.key ? "active" : ""}`}
                  onClick={() => setMobileTab(col.key)}
                >
                  {col.label} ({grouped[col.key].length})
                </button>
              ))}
            </div>

            <div className="board board-5">
              {COLUMNS.map((col) => (
                <div className={`board-col ${mobileTab === col.key ? "mobile-active" : ""}`} key={col.key}>
                  <div className="board-col-head">
                    <span className={`status-chip ${col.key}`}>
                      <span className="dot" />
                      {col.label}
                    </span>
                    <span className="col-count">{grouped[col.key].length}</span>
                  </div>

                  <div className="board-col-body">
                    {loading && <div className="empty-note">Loading…</div>}
                    {!loading && grouped[col.key].length === 0 && <div className="empty-note">Nothing here.</div>}

                    {grouped[col.key].map((c) => (
                      <div className="complaint-card" key={c._id} onClick={() => setSelected(c)}>
                        <div className="card-top">
                          <span className="token-badge">{c.token}</span>
                          <span className="card-date">{formatDate(c.date)}</span>
                        </div>
                        <p className="card-name">{c.customerName}</p>
                        <p className="card-meta">
                          {productSummary(c.items)} · {c.district}
                        </p>

                        {c.assignedTo && (
                          <p className="card-assignee">Assigned to {c.assignedTo.name || c.assignedTo.username}</p>
                        )}

                        {c.status === "new" && (
                          <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                            <select
                              className="assign-select"
                              disabled={busyId === c._id}
                              defaultValue=""
                              onChange={(e) => assign(c._id, e.target.value)}
                            >
                              <option value="" disabled>
                                Assign to manager…
                              </option>
                              {managers.map((m) => (
                                <option key={m._id} value={m._id}>
                                  {m.name || m.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {c.status === "review" && (
                          <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="mini-btn" disabled={busyId === c._id} onClick={() => decide(c._id, "solved")}>
                              Mark Solved
                            </button>
                            <button className="mini-btn" disabled={busyId === c._id} onClick={() => decide(c._id, "pending")}>
                              Mark Pending
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && (
        <DetailModal complaint={selected} onClose={() => setSelected(null)} onDecide={decide} busy={busyId === selected._id} />
      )}

      {staffPanelOpen && <StaffPanel onClose={() => setStaffPanelOpen(false)} />}

      <DashStyles />
    </div>
  );
}

// Warranty Registrations: search + list + full create/edit/delete.
function RegistrationsPanel() {
  const [search, setSearch] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | "create" | "edit"
  const [formInitialData, setFormInitialData] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async (searchTerm = "") => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/warranty", { params: searchTerm ? { search: searchTerm } : {} });
      setRegistrations(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load registrations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setFormInitialData(null);
    setFormMode("create");
  }
  function openEdit(reg) {
    setFormInitialData(reg);
    setFormMode("edit");
    setSelected(null);
  }
  function handleSaved() {
    setFormMode(null);
    setFormInitialData(null);
    load(search);
  }

  async function handleDelete(reg) {
    setDeleteError("");
    if (!window.confirm(`Delete registration ${reg.token}? This cannot be undone.`)) return;
    setDeleteBusy(true);
    try {
      await client.delete(`/warranty/${reg._id}`);
      setSelected(null);
      load(search);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete this registration.");
    } finally {
      setDeleteBusy(false);
    }
  }

  if (formMode) {
    return (
      <AdminRegistrationForm
        mode={formMode}
        initialData={formInitialData}
        registrationId={formInitialData?._id}
        onSaved={handleSaved}
        onCancel={() => setFormMode(null)}
      />
    );
  }

  return (
    <div className="registrations-panel">
      <div className="reg-search-row">
        <input
          type="text"
          placeholder="Search token, name, mobile, or invoice…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="reg-search-input"
        />
        <span className="reg-count">{registrations.length} result{registrations.length === 1 ? "" : "s"}</span>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          + New Registration
        </button>
      </div>

      {error && <div className="dash-error">{error}</div>}
      {deleteError && <div className="dash-error">{deleteError}</div>}

      <div className="reg-list">
        {loading && <div className="empty-note">Loading…</div>}
        {!loading && registrations.length === 0 && <div className="empty-note">No registrations found.</div>}

        {registrations.map((r) => (
          <div className="reg-row" key={r._id} onClick={() => setSelected(r)}>
            <div className="reg-row-main">
              <div className="reg-row-top">
                <span className="token-badge">{r.token}</span>
                <span className="card-date">{formatDate(r.createdAt)}</span>
              </div>
              <p className="card-name">{r.customerName}</p>
              <p className="card-meta">
                {r.mobileNumber} · {r.siteName}, {r.siteDistrict} · {(r.items || []).map((it) => it.product).join(", ")}
              </p>
            </div>
            <span className={`reg-status-chip ${r.status.toLowerCase()}`}>{r.status.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>

      {selected && (
        <RegistrationDetailModal
          registration={selected}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDelete={() => handleDelete(selected)}
          deleteBusy={deleteBusy}
        />
      )}
    </div>
  );
}

function RegistrationDetailModal({ registration: r, onClose, onEdit, onDelete, deleteBusy }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="token-badge">{r.token}</span>
            <span className={`reg-status-chip ${r.status.toLowerCase()}`} style={{ marginLeft: 10 }}>
              {r.status.replace(/_/g, " ")}
            </span>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <h2>{r.customerName}</h2>

        <span className="detail-label">Customer</span>
        <div className="detail-grid">
          <Detail label="Mobile" value={r.mobileNumber} />
          <Detail label="Alternate mobile" value={r.alternateMobile} />
          <Detail label="Email" value={r.email} />
          <Detail label="Customer type" value={r.customerType} />
        </div>

        <span className="detail-label">Site</span>
        <div className="detail-grid">
          <Detail label="Site / building" value={r.siteName} />
          <Detail label="Address" value={`${r.houseNo ? r.houseNo + ", " : ""}${r.street}`} />
          <Detail label="Panchayat" value={r.panchayat} />
          <Detail label="District / State" value={`${r.siteDistrict} / ${r.siteState}`} />
          <Detail label="PIN code" value={r.pincode} />
          <Detail label="Property type" value={r.propertyType} />
          <Detail label="Painting type" value={r.paintingType} />
          <Detail label="Building age" value={r.buildingAge ? `${r.buildingAge} yrs` : ""} />
        </div>

        <span className="detail-label">Purchase</span>
        <div className="detail-grid">
          <Detail label="Purchase date" value={formatDate(r.purchaseDate)} />
          <Detail label="Invoice number" value={r.invoiceNumber} />
          <Detail label="Outlet" value={r.outlet} />
          <Detail label="Purchase district / state" value={`${r.purchaseDistrict} / ${r.purchaseState}`} />
        </div>

        <span className="detail-label">Products</span>
        <div className="items-table">
          {(r.items || []).map((it, i) => (
            <div className="item-line" key={i}>
              <span className="item-line-product">{it.product}</span>
              <span className="item-line-meta">
                {it.shadeType} · {it.containers} × {it.packSize}
                {it.totalQuantity ? ` (${it.totalQuantity})` : ""} · Batch {(it.batchNumbers || []).join(", ")}
                {it.warrantyPeriod ? ` · ${it.warrantyPeriod}` : ""}
              </span>
            </div>
          ))}
        </div>

        <span className="detail-label">Application</span>
        <div className="items-table">
          {(r.applications || []).map((a, i) => (
            <div className="item-line" key={i}>
              <span className="item-line-product">
                {a.applicationArea} — {formatDate(a.paintingStartDate)} to {formatDate(a.paintingCompletionDate)}
              </span>
              <span className="item-line-meta">
                {a.paintedAreaSqft} sqft · {a.topcoats} topcoats{a.applicationMethod ? ` · ${a.applicationMethod}` : ""} ·{" "}
                {a.painterName} ({a.painterMobile})
              </span>
            </div>
          ))}
        </div>

        <span className="detail-label">Painting system</span>
        <div className="detail-grid">
          <Detail label="Putty used" value={r.puttyUsed} />
          <Detail label="Putty brand" value={r.puttyBrand} />
          <Detail label="Primer used" value={r.primerUsed} />
          <Detail label="Primer brand / product" value={[r.primerBrand, r.primerProductName].filter(Boolean).join(" / ")} />
          <Detail label="Primer coats" value={r.primerCoats} />
          <Detail label="Base coat used" value={r.baseCoatUsed} />
          <Detail label="Base coat details" value={r.baseCoatDetails} />
        </div>

        <span className="detail-label">Surface condition</span>
        <div className="detail-grid">
          <Detail label="Water leakage before" value={r.surfaceCondition?.waterLeakageBefore} />
          <Detail label="Dampness / rising damp" value={r.surfaceCondition?.dampnessRisingDamp} />
          <Detail label="Structural cracks" value={r.surfaceCondition?.structuralCracks} />
          <Detail label="Loose plaster" value={r.surfaceCondition?.loosePlaster} />
          <Detail label="Existing peeling" value={r.surfaceCondition?.existingPeeling} />
          <Detail label="Efflorescence" value={r.surfaceCondition?.efflorescence} />
          <Detail label="Fungus / algae" value={r.surfaceCondition?.fungusAlgae} />
          <Detail label="Plumbing leakage" value={r.surfaceCondition?.plumbingLeakage} />
        </div>

        <span className="detail-label">Submitted</span>
        <Detail label="Registered on" value={formatDate(r.createdAt)} />

        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="btn btn-ghost delete-btn" disabled={deleteBusy} onClick={onDelete}>
            {deleteBusy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ complaint, onClose, onDecide, busy }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="token-badge">{complaint.token}</span>
            <span className={`status-chip ${complaint.status}`} style={{ marginLeft: 10 }}>
              <span className="dot" />
              {complaint.status}
            </span>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <h2>{complaint.customerName}</h2>

        <div className="detail-grid">
          <Detail label="Date" value={formatDate(complaint.date)} />
          <Detail label="District" value={complaint.district} />
          <Detail label="Outlet" value={complaint.outlet} />
          <Detail label="Contact number" value={complaint.contactNumber} />
          <Detail label="Invoice number" value={complaint.invoiceNumber} />
          <Detail label="Assigned to" value={complaint.assignedTo?.name || complaint.assignedTo?.username} />
        </div>

        <span className="detail-label">Products</span>
        <div className="items-table">
          {(complaint.items || []).map((it, i) => (
            <div className="item-line" key={i}>
              <span className="item-line-product">{it.product}</span>
              <span className="item-line-meta">
                {it.shadeType} · {it.containers} × {it.packSize} · Batch {(it.batchNumbers || []).join(", ")}
              </span>
            </div>
          ))}
        </div>

        <Detail label="Address" value={complaint.address} full />
        <Detail label="Customer's complaint" value={complaint.complaintText} full />

        {complaint.managerSubmission?.description && (
          <div className="manager-note">
            <span className="detail-label">Manager's report</span>
            <p className="detail-value">{complaint.managerSubmission.description}</p>
            {complaint.managerSubmission.imageUrl && (
              <img
                className="manager-photo"
                src={fileUrl(complaint.managerSubmission.imageUrl)}
                alt="Manager submission"
              />
            )}
          </div>
        )}

        {complaint.status === "review" && (
          <div className="modal-actions">
            <button className="btn btn-primary" disabled={busy} onClick={() => onDecide(complaint._id, "solved")}>
              Mark Solved
            </button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => onDecide(complaint._id, "pending")}>
              Mark Pending
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, full }) {
  return (
    <div className={`detail-item${full ? " full" : ""}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || "—"}</span>
    </div>
  );
}

function formatDateTime(d) {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Super Admin only cross-entity audit trail — claim assignments/status
// changes, warranty registration create/edit/delete, lost-invoice
// approve/reject, and new staff accounts.
function ActivityLogPanel() {
  const [logs, setLogs] = useState([]);
  const [entityType, setEntityType] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (pageNum, type) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/activity-log", {
        params: { page: pageNum, limit: 30, ...(type ? { entityType: type } : {}) },
      });
      setLogs((prev) => (pageNum === 1 ? data.logs : [...prev, ...data.logs]));
      setPage(data.page);
      setPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load the activity log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1, entityType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  return (
    <div className="activity-panel">
      <div className="activity-filter-row">
        <select
          className="activity-filter-select"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All activity</option>
          <option value="complaint">Claims</option>
          <option value="warranty">Warranty Registrations</option>
          <option value="lost_invoice">Lost-Invoice Requests</option>
          <option value="staff">Staff Accounts</option>
        </select>
        <span className="reg-count">
          {total} entr{total === 1 ? "y" : "ies"}
        </span>
      </div>

      {error && <div className="dash-error">{error}</div>}

      <div className="activity-list">
        {loading && logs.length === 0 && <div className="empty-note">Loading…</div>}
        {!loading && logs.length === 0 && <div className="empty-note">No activity yet.</div>}

        {logs.map((log) => (
          <div className="activity-row" key={log._id}>
            <p className="activity-summary">{log.summary}</p>
            <p className="activity-meta">
              {log.actor?.username || "System"} · {formatDateTime(log.createdAt)}
              {log.entityToken ? ` · ${log.entityToken}` : ""}
            </p>
          </div>
        ))}
      </div>

      {page < pages && (
        <div className="activity-load-more">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={loading}
            onClick={() => load(page + 1, entityType)}
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function DashStyles() {
  return (
    <style>{`
      .dash-shell { min-height: 100vh; padding-bottom: 60px; }
      .dash-header { position: sticky; top: 0; z-index: 5; backdrop-filter: blur(14px); background: rgba(242,246,245,0.75); border-bottom: 1px solid var(--line); padding: 18px 0; }
      .header-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
      .dash-header h1 { font-size: 21px; margin-top: 2px; }
      .header-right { display: flex; align-items: center; gap: 14px; }
      .search-input { font-size: 13.5px; padding: 9px 13px; border-radius: 9px; border: 1.5px solid var(--line); background: rgba(255,255,255,0.8); width: 240px; max-width: 40vw; }
      .search-input:focus { outline: none; border-color: var(--teal-500); }
      .admin-name { font-size: 13px; font-weight: 600; color: var(--navy-800); }

      .view-switch { display: flex; gap: 8px; margin-top: 24px; }
      .view-pill { padding: 10px 18px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.6); font-size: 13.5px; font-weight: 700; color: var(--ink-muted); }
      .view-pill.active { background: var(--navy-900); color: #fff; border-color: var(--navy-900); }

      .summary-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
      .summary-chip { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,0.6); border: 1px solid var(--line); color: var(--ink-muted); }
      .summary-chip strong { color: var(--navy-900); font-family: var(--font-mono); }
      .summary-chip .dot { width: 7px; height: 7px; border-radius: 50%; }
      .summary-chip.new .dot { background: var(--status-new); }
      .summary-chip.assigned .dot { background: #7c5cd4; }
      .summary-chip.review .dot { background: #c9862f; }
      .summary-chip.pending .dot { background: var(--status-pending); }
      .summary-chip.solved .dot { background: var(--status-solved); }
      .summary-chip.total .dot { display: none; }

      .dash-error { margin-top: 16px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 14px; font-size: 13.5px; font-weight: 500; }

      .mobile-tabs { display: none; gap: 8px; margin-top: 20px; flex-wrap: wrap; }
      .mobile-tab { padding: 9px 14px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; color: var(--ink-muted); }
      .mobile-tab.active { background: var(--navy-900); color: #fff; border-color: var(--navy-900); }

      .board { display: grid; gap: 18px; margin-top: 22px; align-items: start; }
      .board-5 { grid-template-columns: repeat(5, 1fr); }
      .board-col { background: rgba(255,255,255,0.4); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: 14px; }
      .board-col-head { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px 12px; }
      .col-count { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-muted); }
      .board-col-body { display: flex; flex-direction: column; gap: 10px; min-height: 60px; }
      .empty-note { font-size: 13px; color: var(--ink-muted); padding: 18px 8px; text-align: center; }

      .complaint-card { background: #fff; border-radius: var(--radius-md); padding: 14px 15px; border: 1px solid var(--line); cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
      .complaint-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(11,31,58,0.1); }
      .card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
      .token-badge { font-size: 11.5px; padding: 4px 10px; }
      .card-date { font-size: 11.5px; color: var(--ink-muted); font-family: var(--font-mono); }
      .card-name { font-weight: 700; font-size: 14.5px; color: var(--navy-900); }
      .card-meta { font-size: 12.5px; color: var(--ink-muted); margin-top: 3px; }
      .card-assignee { font-size: 12px; color: var(--teal-600); font-weight: 600; margin-top: 6px; }
      .card-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
      .mini-btn { font-size: 11px; font-weight: 600; padding: 6px 9px; border-radius: 7px; border: 1px solid var(--line); background: rgba(11,31,58,0.04); color: var(--navy-800); }
      .mini-btn:hover { background: rgba(11,31,58,0.08); }
      .mini-btn:disabled { opacity: 0.5; }
      .assign-select { width: 100%; font-size: 12px; padding: 7px 9px; border-radius: 7px; border: 1px solid var(--line); background: #fff; }

      .registrations-panel { margin-top: 22px; }
      .reg-search-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
      .reg-search-input { flex: 1; min-width: 220px; font-size: 13.5px; padding: 10px 14px; border-radius: 9px; border: 1.5px solid var(--line); background: rgba(255,255,255,0.8); }
      .reg-search-input:focus { outline: none; border-color: var(--teal-500); }
      .reg-count { font-size: 12.5px; color: var(--ink-muted); font-family: var(--font-mono); white-space: nowrap; }
      .reg-list { display: flex; flex-direction: column; gap: 10px; }
      .reg-row {
        background: #fff; border: 1px solid var(--line); border-radius: var(--radius-md); cursor: pointer;
        padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
        transition: box-shadow 0.15s ease;
      }
      .reg-row:hover { box-shadow: 0 8px 20px rgba(11,31,58,0.08); }
      .reg-row-main { flex: 1; min-width: 240px; }
      .reg-row-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .reg-status-chip {
        font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.03em; text-transform: capitalize;
        padding: 5px 11px; border-radius: 999px; white-space: nowrap; background: rgba(11,31,58,0.06); color: var(--navy-800);
      }
      .reg-status-chip.submitted { background: var(--status-new-bg); color: var(--status-new); }
      .reg-status-chip.approved, .reg-status-chip.warranty_issued { background: var(--status-solved-bg); color: var(--status-solved); }
      .reg-status-chip.rejected, .reg-status-chip.cancelled { background: #fdeceb; color: var(--status-danger); }
      .reg-status-chip.under_verification { background: var(--status-pending-bg); color: var(--status-pending); }

      .activity-panel { margin-top: 22px; }
      .activity-filter-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
      .activity-filter-select { font-size: 13.5px; padding: 9px 13px; border-radius: 9px; border: 1.5px solid var(--line); background: rgba(255,255,255,0.8); }
      .activity-list { display: flex; flex-direction: column; gap: 8px; }
      .activity-row { background: #fff; border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 16px; }
      .activity-summary { font-size: 13.5px; color: var(--ink); line-height: 1.5; }
      .activity-meta { font-size: 11.5px; color: var(--ink-muted); font-family: var(--font-mono); margin-top: 4px; }
      .activity-load-more { display: flex; justify-content: center; margin-top: 16px; }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(11,19,30,0.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 20; }
      .modal-card { width: 100%; max-width: 620px; max-height: 86vh; overflow-y: auto; padding: 30px; }
      .modal-card.wide { max-width: 720px; }
      .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
      .modal-card h2 { font-size: 21px; margin-bottom: 18px; }
      .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 18px; margin-top: 10px; }
      .detail-item { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; }
      .detail-item.full { grid-column: 1 / -1; }
      .detail-label { display: block; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--teal-600); font-weight: 700; margin-top: 18px; }
      .detail-value { font-size: 14px; color: var(--ink); line-height: 1.5; }
      .items-table { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; margin-bottom: 6px; }
      .item-line { background: rgba(15,138,128,0.05); border: 1px solid var(--line); border-radius: 9px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
      .item-line-product { font-weight: 700; font-size: 13.5px; color: var(--navy-900); }
      .item-line-meta { font-size: 12px; color: var(--ink-muted); font-family: var(--font-mono); }
      .manager-note { margin-top: 6px; padding-top: 18px; border-top: 1px solid var(--line); }
      .manager-photo { display: block; margin-top: 12px; max-width: 100%; border-radius: var(--radius-md); border: 1px solid var(--line); }
      .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--line); }
      .delete-btn { color: var(--status-danger); }

      @media (max-width: 1100px) {
        .board-5 { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 900px) {
        .board { grid-template-columns: 1fr; }
        .board-col { display: none; }
        .board-col.mobile-active { display: block; }
        .mobile-tabs { display: flex; }
      }
      @media (max-width: 640px) {
        .header-inner { flex-direction: column; align-items: flex-start; }
        .search-input { width: 100%; max-width: none; }
        .detail-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
import { useEffect, useMemo, useState, useCallback } from "react";
import client, { fileUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StaffPanel from "../components/StaffPanel.jsx";

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

export default function AdminDashboard() {
  const { name, logout } = useAuth();
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
    load();
  }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
            <input
              className="search-input"
              type="text"
              placeholder="Search token, name, phone, invoice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                      {c.product} · {c.district}
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
      </div>

      {selected && (
        <DetailModal complaint={selected} onClose={() => setSelected(null)} onDecide={decide} busy={busyId === selected._id} />
      )}

      {staffPanelOpen && <StaffPanel onClose={() => setStaffPanelOpen(false)} />}

      <DashStyles />
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
          <Detail label="Product" value={complaint.product} />
          <Detail label="Batch no." value={complaint.batchNo} />
          <Detail label="Quantity" value={complaint.quantity} />
          <Detail label="Code" value={complaint.code} />
          <Detail label="Assigned to" value={complaint.assignedTo?.name || complaint.assignedTo?.username} />
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

      .summary-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
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

      .modal-backdrop { position: fixed; inset: 0; background: rgba(11,19,30,0.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 20; }
      .modal-card { width: 100%; max-width: 620px; max-height: 86vh; overflow-y: auto; padding: 30px; }
      .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
      .modal-card h2 { font-size: 21px; margin-bottom: 18px; }
      .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 18px; }
      .detail-item { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; }
      .detail-item.full { grid-column: 1 / -1; }
      .detail-label { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--teal-600); font-weight: 700; }
      .detail-value { font-size: 14px; color: var(--ink); line-height: 1.5; }
      .manager-note { margin-top: 6px; padding-top: 18px; border-top: 1px solid var(--line); }
      .manager-photo { display: block; margin-top: 12px; max-width: 100%; border-radius: var(--radius-md); border: 1px solid var(--line); }
      .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; padding-top: 18px; border-top: 1px solid var(--line); }

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
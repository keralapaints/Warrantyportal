import { useEffect, useState, useCallback } from "react";
import client, { fileUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { key: "review", label: "Awaiting your review" },
  { key: "pending", label: "Pending" },
  { key: "solved", label: "Solved" },
];

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function productSummary(items) {
  if (!items || items.length === 0) return "";
  return items.map((it) => it.product).join(", ");
}

export default function HappinessDashboard() {
  const { name, logout } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [tab, setTab] = useState("review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reviewRes, pendingRes, solvedRes] = await Promise.all([
        client.get("/complaints", { params: { status: "review" } }),
        client.get("/complaints", { params: { status: "pending" } }),
        client.get("/complaints", { params: { status: "solved" } }),
      ]);
      setComplaints([...reviewRes.data, ...pendingRes.data, ...solvedRes.data]);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id, status) {
    setBusyId(id);
    try {
      const { data } = await client.patch(`/complaints/${id}/status`, { status });
      setComplaints((list) => list.map((c) => (c._id === id ? data : c)));
      setSelected((sel) => (sel && sel._id === id ? data : sel));
    } catch (err) {
      setError(err.response?.data?.message || "Could not update status.");
    } finally {
      setBusyId(null);
    }
  }

  const visible = complaints.filter((c) => c.status === tab);

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="container header-inner">
          <div>
            <span className="eyebrow">Kerala Paints · Happiness Desk</span>
            <h1>Review &amp; Close Complaints</h1>
          </div>
          <div className="header-right">
            <span className="admin-name">{name}</span>
            <button className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        <div className="tab-row">
          {TABS.map((t) => (
            <button key={t.key} className={`tab-pill ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label} ({complaints.filter((c) => c.status === t.key).length})
            </button>
          ))}
        </div>

        {error && <div className="dash-error">{error}</div>}

        <div className="list">
          {loading && <div className="empty-note">Loading…</div>}
          {!loading && visible.length === 0 && <div className="empty-note">Nothing here.</div>}

          {visible.map((c) => (
            <div className="complaint-row" key={c._id} onClick={() => setSelected(c)}>
              <div className="row-main">
                <div className="row-top">
                  <span className="token-badge">{c.token}</span>
                  <span className="card-date">{formatDate(c.date)}</span>
                </div>
                <p className="card-name">{c.customerName}</p>
                <p className="card-meta">
                  {productSummary(c.items)} · {c.district} · handled by{" "}
                  {c.assignedTo?.name || c.assignedTo?.username || "—"}
                </p>
                {c.managerSubmission?.description && (
                  <p className="card-complaint">{c.managerSubmission.description}</p>
                )}
              </div>

              {c.status === "review" && (
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-primary" disabled={busyId === c._id} onClick={() => decide(c._id, "solved")}>
                    Solved
                  </button>
                  <button className="btn btn-ghost" disabled={busyId === c._id} onClick={() => decide(c._id, "pending")}>
                    Pending
                  </button>
                </div>
              )}
              {c.status !== "review" && (
                <span className={`status-chip ${c.status}`}>
                  <span className="dot" />
                  {c.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <DetailModal complaint={selected} onClose={() => setSelected(null)} onDecide={decide} busy={busyId === selected._id} />
      )}

      <HappinessStyles />
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
          <Detail label="District / Outlet" value={`${complaint.district} / ${complaint.outlet}`} />
          <Detail label="Handled by" value={complaint.assignedTo?.name || complaint.assignedTo?.username} />
        </div>

        <span className="detail-label">Products</span>
        <div className="items-table">
          {(complaint.items || []).map((it, i) => (
            <div className="item-line" key={i}>
              <span className="item-line-product">{it.product}</span>
              <span className="item-line-meta">
                Qty {it.quantity} · Batch {it.batchNo} · Code {it.code}
              </span>
            </div>
          ))}
        </div>

        <Detail label="Customer's complaint" value={complaint.complaintText} full />

        {complaint.managerSubmission?.description && (
          <div className="manager-note">
            <span className="detail-label">Manager's report</span>
            <p className="detail-value">{complaint.managerSubmission.description}</p>
            {complaint.managerSubmission.imageUrl && (
              <img className="manager-photo" src={fileUrl(complaint.managerSubmission.imageUrl)} alt="Manager submission" />
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
        {complaint.status === "pending" && (
          <div className="modal-actions">
            <button className="btn btn-primary" disabled={busy} onClick={() => onDecide(complaint._id, "solved")}>
              Mark Solved
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

function HappinessStyles() {
  return (
    <style>{`
      .dash-shell { min-height: 100vh; padding-bottom: 60px; }
      .dash-header { position: sticky; top: 0; z-index: 5; backdrop-filter: blur(14px); background: rgba(242,246,245,0.75); border-bottom: 1px solid var(--line); padding: 18px 0; }
      .header-inner { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; }
      .dash-header h1 { font-size: 21px; margin-top: 2px; }
      .header-right { display: flex; align-items: center; gap: 14px; }
      .admin-name { font-size: 13px; font-weight: 600; color: var(--navy-800); }

      .tab-row { display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap; }
      .tab-pill { padding: 9px 16px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; color: var(--ink-muted); }
      .tab-pill.active { background: var(--navy-900); color: #fff; border-color: var(--navy-900); }

      .dash-error { margin-top: 16px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 14px; font-size: 13.5px; font-weight: 500; }

      .list { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
      .empty-note { font-size: 13px; color: var(--ink-muted); padding: 30px 0; text-align: center; }
      .complaint-row {
        background: #fff; border: 1px solid var(--line); border-radius: var(--radius-md); cursor: pointer;
        padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
        transition: box-shadow 0.15s ease;
      }
      .complaint-row:hover { box-shadow: 0 8px 20px rgba(11,31,58,0.08); }
      .row-main { flex: 1; min-width: 240px; }
      .row-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .token-badge { font-size: 11.5px; padding: 4px 10px; }
      .card-date { font-size: 11.5px; color: var(--ink-muted); font-family: var(--font-mono); }
      .card-name { font-weight: 700; font-size: 14.5px; color: var(--navy-900); }
      .card-meta { font-size: 12.5px; color: var(--ink-muted); margin-top: 3px; }
      .card-complaint { font-size: 13px; color: var(--ink); margin-top: 8px; line-height: 1.5; }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(11,19,30,0.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 20; }
      .modal-card { width: 100%; max-width: 600px; max-height: 86vh; overflow-y: auto; padding: 30px; }
      .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
      .modal-card h2 { font-size: 20px; margin-bottom: 18px; }
      .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 18px; }
      .detail-item { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; }
      .detail-item.full { grid-column: 1 / -1; }
      .detail-label { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--teal-600); font-weight: 700; }
      .detail-value { font-size: 14px; color: var(--ink); line-height: 1.5; }
      .items-table { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; margin-bottom: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
      .item-line { background: rgba(15,138,128,0.05); border: 1px solid var(--line); border-radius: 9px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
      .item-line-product { font-weight: 700; font-size: 13.5px; color: var(--navy-900); }
      .item-line-meta { font-size: 12px; color: var(--ink-muted); font-family: var(--font-mono); }
      .manager-note { margin-top: 6px; padding-top: 18px; border-top: 1px solid var(--line); }
      .manager-photo { display: block; margin-top: 12px; max-width: 100%; border-radius: var(--radius-md); border: 1px solid var(--line); }
      .modal-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; padding-top: 18px; border-top: 1px solid var(--line); }

      @media (max-width: 640px) {
        .header-inner { flex-direction: column; align-items: flex-start; }
        .complaint-row { flex-direction: column; align-items: flex-start; }
      }
    `}</style>
  );
}
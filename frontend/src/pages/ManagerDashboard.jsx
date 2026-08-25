import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ManagerDashboard() {
  const { name, logout } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null); // complaint being worked on
  const [tab, setTab] = useState("assigned"); // assigned | review | pending | solved

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/complaints/mine");
      setComplaints(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load your complaints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = complaints.filter((c) => c.status === tab);

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <div className="container header-inner">
          <div>
            <span className="eyebrow">Kerala Paints · Manager</span>
            <h1>My Assigned Complaints</h1>
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
          {[
            { key: "assigned", label: "To do" },
            { key: "review", label: "Submitted" },
            { key: "pending", label: "Reopened" },
            { key: "solved", label: "Solved" },
          ].map((t) => (
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
            <div className="complaint-row" key={c._id}>
              <div className="row-main">
                <div className="row-top">
                  <span className="token-badge">{c.token}</span>
                  <span className="card-date">{formatDate(c.date)}</span>
                </div>
                <p className="card-name">{c.customerName}</p>
                <p className="card-meta">
                  {c.product} · {c.district} · {c.outlet}
                </p>
                <p className="card-complaint">{c.complaintText}</p>
              </div>

              {c.status === "assigned" && (
                <button className="btn btn-primary" onClick={() => setActive(c)}>
                  Add report
                </button>
              )}
              {c.status !== "assigned" && (
                <span className={`status-chip ${c.status}`}>
                  <span className="dot" />
                  {c.status === "review" ? "Waiting for review" : c.status}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {active && (
        <SubmitModal
          complaint={active}
          onClose={() => setActive(null)}
          onSubmitted={(updated) => {
            setComplaints((list) => list.map((c) => (c._id === updated._id ? updated : c)));
            setActive(null);
            setTab("review");
          }}
        />
      )}

      <ManagerStyles />
    </div>
  );
}

function SubmitModal({ complaint, onClose, onSubmitted }) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Add a description before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("description", description.trim());
      if (file) formData.append("image", file);

      const { data } = await client.patch(`/complaints/${complaint._id}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSubmitted(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="token-badge">{complaint.token}</span>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <h2>{complaint.customerName}</h2>
        <p className="original-complaint">{complaint.complaintText}</p>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginTop: 18 }}>
            <label>What did you find? Describe the issue and any action taken</label>
            <textarea
              style={{ minHeight: 120 }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Checked the batch, product had settled due to storage. Advised customer to stir before use, replaced 1 tin."
            />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Photo (optional)</label>
            <input type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFile} />
            {preview && <img src={preview} alt="Preview" className="upload-preview" />}
          </div>

          {error && <div className="submit-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 20 }}>
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ManagerStyles() {
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
        background: #fff; border: 1px solid var(--line); border-radius: var(--radius-md);
        padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
      }
      .row-main { flex: 1; min-width: 240px; }
      .row-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .token-badge { font-size: 11.5px; padding: 4px 10px; }
      .card-date { font-size: 11.5px; color: var(--ink-muted); font-family: var(--font-mono); }
      .card-name { font-weight: 700; font-size: 14.5px; color: var(--navy-900); }
      .card-meta { font-size: 12.5px; color: var(--ink-muted); margin-top: 3px; }
      .card-complaint { font-size: 13px; color: var(--ink); margin-top: 8px; line-height: 1.5; }

      .modal-backdrop { position: fixed; inset: 0; background: rgba(11,19,30,0.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 20; }
      .modal-card { width: 100%; max-width: 560px; max-height: 86vh; overflow-y: auto; padding: 30px; }
      .modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
      .modal-card h2 { font-size: 20px; }
      .original-complaint { font-size: 13.5px; color: var(--ink-muted); margin-top: 8px; line-height: 1.5; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
      .upload-preview { display: block; margin-top: 12px; max-width: 100%; max-height: 220px; border-radius: var(--radius-md); border: 1px solid var(--line); }
      .submit-error { margin-top: 16px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 13px; font-size: 13px; font-weight: 500; }

      @media (max-width: 640px) {
        .header-inner { flex-direction: column; align-items: flex-start; }
        .complaint-row { flex-direction: column; align-items: flex-start; }
      }
    `}</style>
  );
}
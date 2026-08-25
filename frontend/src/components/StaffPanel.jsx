import { useEffect, useState, useCallback } from "react";
import client from "../api/client";

const ROLE_LABEL = {
  admin: "Admin",
  manager: "Manager",
  happiness_manager: "Happiness Manager",
};

const emptyForm = { username: "", password: "", name: "", role: "manager" };

export default function StaffPanel({ onClose }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await client.get("/auth/staff");
      setStaff(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load staff accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");

    if (!form.username.trim() || !form.password.trim()) {
      setCreateError("Username and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setCreateError("Password should be at least 6 characters.");
      return;
    }

    setCreating(true);
    try {
      await client.post("/auth/staff", {
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim() || form.username.trim(),
        role: form.role,
      });
      setForm(emptyForm);
      load();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Could not create the account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card glass-card staff-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ marginBottom: 0 }}>Manage Staff</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleCreate} className="staff-form">
          <div className="staff-form-grid">
            <div className="field">
              <label>Username</label>
              <input type="text" value={form.username} onChange={update("username")} placeholder="e.g. ravi" />
            </div>
            <div className="field">
              <label>Full name</label>
              <input type="text" value={form.name} onChange={update("name")} placeholder="e.g. Ravi Kumar" />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="text"
                value={form.password}
                onChange={update("password")}
                placeholder="Temporary password"
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={update("role")}>
                <option value="manager">Manager</option>
                <option value="happiness_manager">Happiness Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {createError && <div className="submit-error">{createError}</div>}

          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="staff-list-head">
          <span className="detail-label">Existing accounts</span>
        </div>

        {error && <div className="submit-error">{error}</div>}
        {loading && <div className="empty-note">Loading…</div>}

        <div className="staff-list">
          {!loading &&
            staff.map((s) => (
              <div className="staff-row" key={s._id}>
                <div>
                  <p className="staff-name">{s.name || s.username}</p>
                  <p className="staff-username">@{s.username}</p>
                </div>
                <span className={`role-chip role-${s.role}`}>{ROLE_LABEL[s.role] || s.role}</span>
              </div>
            ))}
        </div>
      </div>

      <style>{`
        .staff-panel { max-width: 560px; }
        .staff-form { margin-top: 18px; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
        .staff-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
        .staff-list-head { margin-top: 22px; margin-bottom: 12px; }
        .staff-list { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
        .staff-row {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: #fff; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 10px 14px;
        }
        .staff-name { font-weight: 700; font-size: 13.5px; color: var(--navy-900); }
        .staff-username { font-size: 12px; color: var(--ink-muted); font-family: var(--font-mono); margin-top: 2px; }
        .role-chip { font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
        .role-admin { background: #ece7fb; color: #5b3fc0; }
        .role-manager { background: var(--status-new-bg); color: var(--status-new); }
        .role-happiness_manager { background: var(--status-solved-bg); color: var(--status-solved); }
        .submit-error { margin-top: 4px; margin-bottom: 12px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 10px 13px; font-size: 12.5px; font-weight: 500; }
        @media (max-width: 520px) {
          .staff-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
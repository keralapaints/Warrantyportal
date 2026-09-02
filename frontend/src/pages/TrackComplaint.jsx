import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import client from "../api/client";

const STATUS_LABEL = { new: "New", assigned: "Assigned", review: "In Review", pending: "Pending", solved: "Solved" };

export default function TrackComplaint() {
  const location = useLocation();
  const [tokenInput, setTokenInput] = useState(location.state?.token || "");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await client.get(`/complaints/track/${tokenInput.trim().toUpperCase()}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not find that token.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="container narrow">
        <div className="glass-card track-card">
          <span className="eyebrow">Kerala Paints · Complaint Desk</span>
          <h1>Track your complaint</h1>
          <p className="intro">Enter the token you received when you submitted your complaint.</p>

          <form onSubmit={handleSearch} className="track-form">
            <input
              type="text"
              placeholder="e.g. KP-2026-0001"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Checking…" : "Check status"}
            </button>
          </form>

          {error && <div className="submit-error">{error}</div>}

          {result && (
            <div className="result-panel">
              <div className="result-row">
                <span className="token-badge">{result.token}</span>
                <span className={`status-chip ${result.status}`}>
                  <span className="dot" />
                  {STATUS_LABEL[result.status]}
                </span>
              </div>
              <p className="result-meta">
                {(result.items || []).map((it) => it.product).join(", ")} · submitted{" "}
                {new Date(result.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          )}

          <Link to="/" className="back-link">
            ← Submit a new complaint
          </Link>
        </div>
      </div>
      <style>{`
        .page-shell { min-height: 100vh; padding: 56px 0 80px; display: flex; align-items: flex-start; justify-content: center; }
        .container.narrow { max-width: 560px; }
        .track-card { padding: 40px 36px; animation: rise 0.5s ease both; }
        @keyframes rise { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
        .track-card h1 { font-size: 26px; margin-top: 6px; }
        .intro { color: var(--ink-muted); margin-top: 10px; font-size: 14.5px; }
        .track-form { display: flex; gap: 10px; margin-top: 22px; }
        .track-form input {
          flex: 1; font-family: var(--font-mono); font-size: 14.5px; padding: 12px 14px;
          border-radius: 9px; border: 1.5px solid var(--line); background: rgba(255,255,255,0.75);
        }
        .track-form input:focus { outline: none; border-color: var(--teal-500); box-shadow: 0 0 0 4px rgba(15,163,150,0.14); }
        .submit-error { margin-top: 18px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 12px 14px; font-size: 13.5px; font-weight: 500; }
        .result-panel { margin-top: 26px; padding-top: 22px; border-top: 1px solid var(--line); }
        .result-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .result-meta { margin-top: 10px; font-size: 13.5px; color: var(--ink-muted); }
        .back-link { display: inline-block; margin-top: 28px; font-size: 13.5px; color: var(--teal-600); font-weight: 600; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
        @media (max-width: 520px) {
          .track-card { padding: 28px 22px; }
          .track-form { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}

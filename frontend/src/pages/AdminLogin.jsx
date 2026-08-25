import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  admin: "/admin",
  manager: "/manager",
  happiness_manager: "/happiness",
};

export default function AdminLogin() {
  const { login, isAuthed, role } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthed) return <Navigate to={ROLE_HOME[role] || "/admin"} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInRole = await login(username, password);
      navigate(ROLE_HOME[loggedInRole] || "/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="glass-card login-card">
        <span className="eyebrow">Kerala Paints · Staff Login</span>
        <h1>Complaint Desk</h1>
        <p className="intro">Sign in to manage complaint tokens.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Username</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label>Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: 22 }}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <style>{`
        .login-shell { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .login-card { width: 100%; max-width: 380px; padding: 40px 34px; animation: rise 0.5s ease both; }
        @keyframes rise { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
        .login-card h1 { font-size: 24px; margin-top: 6px; }
        .intro { color: var(--ink-muted); margin-top: 8px; margin-bottom: 24px; font-size: 14px; }
        .login-error { margin-top: 16px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 11px 13px; font-size: 13px; font-weight: 500; }
      `}</style>
    </div>
  );
}
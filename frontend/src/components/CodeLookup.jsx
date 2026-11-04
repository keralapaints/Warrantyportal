import { useState } from "react";
import client from "../api/client";

// Staff-only helper: paste the code a customer read out (for example KP-73AR-4ZSC)
// and see the original running number (for example KP-2026-0005).
export default function CodeLookup() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const { data } = await client.get("/codes/decode", { params: { code: value } });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not look up that code. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(result.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* copying is optional: ignore if the browser blocks it */
    }
  }

  return (
    <div className="code-lookup">
      <form className="code-lookup-form" onSubmit={lookup}>
        <label className="code-lookup-label" htmlFor="code-lookup-input">
          Customer code → original number
        </label>
        <input
          id="code-lookup-input"
          className="code-lookup-input"
          type="text"
          placeholder="Paste a customer code, e.g. KP-73AR-4ZSC"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        <button type="submit" className="btn btn-ghost" disabled={busy || !code.trim()}>
          {busy ? "Looking up…" : "Find original number"}
        </button>
      </form>

      {result && (
        <p className="code-lookup-result">
          <strong className="code-mono">{result.code}</strong> is {result.kindLabel.toLowerCase()}{" "}
          <strong className="code-mono code-number">{result.number}</strong>
          <span className="code-status">status: {String(result.status || "").replace(/_/g, " ").toLowerCase()}</span>
          <button type="button" className="code-copy" onClick={copyNumber}>
            {copied ? "Copied" : "Copy number"}
          </button>
        </p>
      )}
      {error && <p className="code-lookup-error">{error}</p>}

      <style>{`
        .code-lookup { margin-top: 20px; background: rgba(255,255,255,0.6); border: 1px solid var(--line); border-radius: var(--radius-md); padding: 12px 14px; }
        .code-lookup-form { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .code-lookup-label { font-size: 12.5px; font-weight: 700; color: var(--navy-800); white-space: nowrap; }
        .code-lookup-input { flex: 1; min-width: 220px; font-family: var(--font-mono); font-size: 16px; padding: 9px 12px; border-radius: 9px; border: 1.5px solid var(--line); background: rgba(255,255,255,0.85); text-transform: uppercase; }
        .code-lookup-input::placeholder { text-transform: none; }
        .code-lookup-input:focus { outline: none; border-color: var(--teal-500); }
        .code-lookup-result { margin-top: 10px; font-size: 14px; color: var(--ink); line-height: 1.6; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .code-mono { font-family: var(--font-mono); }
        .code-number { color: var(--navy-900); background: rgba(38,178,231,0.12); padding: 3px 9px; border-radius: 7px; }
        .code-status { color: var(--ink-muted); font-size: 12.5px; }
        .code-copy { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 7px; border: 1px solid var(--line); background: #fff; color: var(--navy-800); cursor: pointer; }
        .code-copy:hover { background: rgba(11,31,58,0.05); }
        .code-lookup-error { margin-top: 10px; background: #fdeceb; color: var(--status-danger); border-radius: 9px; padding: 9px 12px; font-size: 13px; font-weight: 500; }
        @media (max-width: 640px) {
          .code-lookup-label { flex-basis: 100%; white-space: normal; }
          .code-lookup-input { flex: 1 1 100%; min-width: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
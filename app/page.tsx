"use client";

import { useState } from "react";

type Severity = "high" | "medium" | "low";

interface Finding {
  severity: Severity;
  title: string;
  explanation: string;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  high: "bg-red-900/50 text-red-300 border-red-700",
  medium: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  low: "bg-blue-900/50 text-blue-300 border-blue-700",
};

const SEVERITY_BADGE: Record<Severity, string> = {
  high: "bg-red-700 text-red-100",
  medium: "bg-yellow-700 text-yellow-100",
  low: "bg-blue-700 text-blue-100",
};

export default function Home() {
  const [code, setCode] = useState("");
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFindings(null);
    setVerified(false);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Audit failed");
        return;
      }

      setFindings(data.findings ?? []);
      setVerified(data.verified === true);
    } catch {
      setError("Network error — could not reach the audit API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-white">
        Verifiable Contract Auditor
      </h1>
      <p className="text-gray-400 mb-8">
        Paste Solidity code below to scan for vulnerabilities.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="// Paste your Solidity contract here..."
          rows={18}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 text-gray-100 font-mono text-sm px-4 py-3 resize-y placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!code.trim() || loading}
          className="self-start px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Auditing…" : "Audit Contract"}
        </button>
      </form>

      {error && (
        <div className="mt-8 rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {findings !== null && (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <h2 className="text-xl font-semibold text-white">
              Findings{" "}
              <span className="text-gray-400 font-normal text-base">
                ({findings.length})
              </span>
            </h2>
            {verified && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified via 0G Compute (TEE)
              </span>
            )}
          </div>

          {findings.length === 0 ? (
            <div className="rounded-lg border border-green-700 bg-green-900/30 px-4 py-3 text-green-300 text-sm">
              No vulnerabilities detected.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {findings.map((f, i) => (
                <li
                  key={i}
                  className={`rounded-lg border px-4 py-3 ${SEVERITY_STYLES[f.severity]}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${SEVERITY_BADGE[f.severity]}`}
                    >
                      {f.severity}
                    </span>
                    <span className="font-semibold text-white">{f.title}</span>
                  </div>
                  <p className="text-sm opacity-90">{f.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

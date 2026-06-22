"use client";

import { useState } from "react";

type Severity = "high" | "medium" | "low";
type Mode = "paste" | "address";

interface Finding {
  severity: Severity;
  title: string;
  explanation: string;
}

const SEVERITY: Record<Severity, { card: string; badge: string }> = {
  high: {
    card: "border-red-500/25 bg-red-950/30",
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
  },
  medium: {
    card: "border-amber-500/25 bg-amber-950/30",
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
  low: {
    card: "border-blue-500/25 bg-blue-950/30",
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
};

function IconCode() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <line x1="12" y1="8" x2="12" y2="12" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeOpacity="0.3" />
      <path d="M12 2v4" />
    </svg>
  );
}

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <IconCode />,
    title: "Paste your Solidity code",
    desc: "Drop in any Solidity contract — whole files or isolated snippets.",
  },
  {
    step: "02",
    icon: <IconNetwork />,
    title: "AI scans on 0G's verified network",
    desc: "Your contract is analyzed inside a hardware-isolated TEE enclave on 0G Compute.",
  },
  {
    step: "03",
    icon: <IconShield />,
    title: "Get findings + cryptographic proof",
    desc: "Results come with on-chain attestation proving the audit was real and unmodified.",
  },
];

function extractSource(raw: string): string {
  // Standard JSON Input wrapped in extra braces: {{ ... }}
  if (raw.startsWith("{{")) {
    try {
      const inner = JSON.parse(raw.slice(1, -1));
      const files = Object.values(inner.sources ?? {}) as { content: string }[];
      const combined = files.map((f) => f.content ?? "").join("\n\n");
      if (combined.trim()) return combined;
    } catch { /* fall through */ }
  }
  // Standard JSON Input: { "sources": { ... } }
  if (raw.startsWith("{")) {
    try {
      const inner = JSON.parse(raw);
      const files = Object.values(inner.sources ?? {}) as { content: string }[];
      const combined = files.map((f) => f.content ?? "").join("\n\n");
      if (combined.trim()) return combined;
    } catch { /* fall through */ }
  }
  return raw;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("paste");
  const [code, setCode] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [verified, setVerified] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSource, setFetchingSource] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFindings(null);
    setVerified(false);
    setTxHash(null);

    let sourceCode = code;

    if (mode === "address") {
      const addr = contractAddress.trim();

      if (!/^0x[0-9a-fA-F]{40}$/i.test(addr)) {
        setError("Enter a valid contract address (0x followed by 40 hex characters)");
        setLoading(false);
        return;
      }

      setFetchingSource(true);
      try {
        const res = await fetch(`/api/source?address=${addr}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to reach 0G explorer");
          setLoading(false);
          setFetchingSource(false);
          return;
        }

        const rawSource: string = data?.result?.[0]?.SourceCode ?? "";

        if (
          data.status !== "1" ||
          !rawSource.trim() ||
          rawSource === "Contract source code not verified"
        ) {
          setError("Contract source not verified on 0G explorer");
          setLoading(false);
          setFetchingSource(false);
          return;
        }

        sourceCode = extractSource(rawSource);
        setCode(sourceCode);
      } catch {
        setError("Failed to reach 0G explorer — try again or paste the source directly");
        setLoading(false);
        setFetchingSource(false);
        return;
      }
      setFetchingSource(false);
    }

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sourceCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Audit failed");
        return;
      }
      setFindings(data.findings ?? []);
      setVerified(data.verified === true);
      setTxHash(data.txHash ?? null);
    } catch {
      setError("Network error — could not reach the audit API");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading && (mode === "paste" ? code.trim().length > 0 : contractAddress.trim().length > 0);

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Nav ── */}
      <nav className="border-b border-white/[0.06] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-2.5">
          <span className="text-emerald-400">
            <IconShield />
          </span>
          <span className="font-semibold text-sm text-white/90 tracking-wide">
            Verifiable Contract Auditor
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-20">
        {/* ambient glow */}
        <div
          aria-hidden
          className="hero-glow pointer-events-none absolute top-[-80px] left-1/2 -translate-x-1/2 w-[700px] h-[340px] rounded-full"
        />

        <div className="relative max-w-2xl mx-auto text-center">
          {/* Chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Powered by 0G Compute Network
          </div>

          <h1 className="text-4xl sm:text-[52px] font-bold tracking-tight leading-[1.1] mb-5">
            Audit Any Smart Contract<br />
            <span className="text-emerald-400">With Cryptographic Proof</span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed">
            Powered by 0G Compute's TEE network. Every audit is verifiable
            on-chain —{" "}
            <span className="text-gray-300">not just an AI guess.</span>
          </p>
        </div>

        {/* How it works */}
        <div className="relative max-w-4xl mx-auto mt-14">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-600 mb-6">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {HOW_IT_WORKS.map(({ step, icon, title, desc }) => (
              <div
                key={step}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-5 py-5 flex flex-col gap-3 hover:border-emerald-500/20 transition-colors duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    {icon}
                  </div>
                  <span className="text-xl font-bold text-white/[0.07] select-none">
                    {step}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm leading-snug">
                    {title}
                  </p>
                  <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audit Tool ── */}
      <section className="px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0a0d14] overflow-hidden shadow-2xl">
            {/* Tool chrome bar */}
            <div className="border-b border-white/[0.07] px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Contract Auditor</p>
                <p className="text-gray-600 text-xs mt-0.5">
                  Solidity ^0.4.x – ^0.8.x
                </p>
              </div>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

              {/* ── Mode tabs ── */}
              <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] self-start">
                {(["paste", "address"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                      mode === m
                        ? "bg-white/[0.09] text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {m === "paste" ? "Paste Code" : "Contract Address"}
                  </button>
                ))}
              </div>

              {/* ── Source input ── */}
              {mode === "paste" ? (
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste your Solidity contract source code here..."
                  rows={16}
                  className="w-full rounded-lg border border-white/[0.07] bg-[#060810] text-gray-200 font-mono text-sm px-4 py-3 resize-y placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-colors duration-200"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="0x1234...abcd"
                    spellCheck={false}
                    className="w-full rounded-lg border border-white/[0.07] bg-[#060810] text-gray-200 font-mono text-sm px-4 py-3 placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-colors duration-200"
                  />
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Source code is fetched from the 0G Explorer. The contract must be verified on-chain.
                  </p>
                </div>
              )}

              {/* ── Footer row ── */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-gray-700 text-xs">
                  Processed through 0G Compute's decentralized TEE nodes
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  {loading ? (
                    <>
                      <IconSpinner />
                      {fetchingSource ? "Fetching source…" : "Auditing…"}
                    </>
                  ) : (
                    <>
                      Audit Contract
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ── Error ── */}
      {error && (
        <div className="px-6 pb-6">
          <div className="max-w-3xl mx-auto rounded-xl border border-red-500/25 bg-red-950/25 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {findings !== null && (
        <section className="px-6 pb-20">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-5">
              <h2 className="font-semibold text-white text-lg">
                {findings.length === 0
                  ? "No Issues Found"
                  : `${findings.length} Finding${findings.length === 1 ? "" : "s"}`}
              </h2>
              {findings.length > 0 && (
                <span className="text-xs text-gray-600 font-medium">
                  {findings.filter((f) => f.severity === "high").length} high ·{" "}
                  {findings.filter((f) => f.severity === "medium").length} medium ·{" "}
                  {findings.filter((f) => f.severity === "low").length} low
                </span>
              )}
            </div>

            {findings.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-5 py-4 text-emerald-300 text-sm flex items-center gap-3 mb-5">
                <span className="text-emerald-400 shrink-0">
                  <IconShield />
                </span>
                No vulnerabilities detected in this contract.
              </div>
            ) : (
              <ul className="flex flex-col gap-2.5 mb-6">
                {findings.map((f, i) => (
                  <li
                    key={i}
                    className={`rounded-xl border px-5 py-4 ${SEVERITY[f.severity].card}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${SEVERITY[f.severity].badge}`}
                      >
                        {f.severity}
                      </span>
                      <div>
                        <p className="font-semibold text-white text-sm leading-snug">
                          {f.title}
                        </p>
                        <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                          {f.explanation}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Verification banner */}
            <div
              className={`rounded-xl border px-5 py-5 flex gap-4 transition-colors duration-500 ${
                verified
                  ? "border-emerald-500/25 bg-emerald-950/20"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <div
                className={`shrink-0 p-2.5 rounded-xl ${
                  verified
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-white/[0.05] text-gray-600"
                }`}
              >
                <IconShield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <p
                    className={`font-semibold text-sm ${
                      verified ? "text-emerald-300" : "text-gray-500"
                    }`}
                  >
                    {verified ? "Verified by 0G Compute" : "Processed by 0G Compute"}
                  </p>
                  {verified && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      TEE Attested
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs leading-relaxed">
                  This audit was processed through 0G's Trusted Execution
                  Environment (TEE). The result is cryptographically attested —
                  meaning it cannot be faked or tampered with.
                </p>
              </div>
            </div>

            {/* On-chain verification */}
            {txHash && (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 px-5 py-5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 mt-0.5">
                    <IconShield className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-300 text-sm mb-1">
                      Verify this audit
                    </p>
                    <p className="text-gray-500 text-xs leading-relaxed mb-4">
                      This audit was settled on-chain. Anyone can verify it
                      independently.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        title={txHash}
                        className="font-mono text-xs text-gray-300 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 cursor-default select-all"
                      >
                        {txHash.slice(0, 6)}…{txHash.slice(-4)}
                      </span>
                      <a
                        href={`https://chainscan-galileo.0g.ai/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View on 0G Explorer
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* spacer */}
      <div className="flex-1" />

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-600 text-xs">
            <span className="text-gray-700">
              <IconShield />
            </span>
            Built on 0G Compute Network · Zero Cup 2026
          </div>
          <p className="text-gray-700 text-xs">
            Audit results are TEE-attested on the 0G testnet
          </p>
        </div>
      </footer>

    </div>
  );
}

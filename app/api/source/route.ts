import { NextRequest, NextResponse } from "next/server";

const EXPLORERS = [
  "https://chainscan-galileo.0g.ai", // testnet
  "https://chainscan.0g.ai",         // mainnet
];

async function safeJsonFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error("HTML response — endpoint does not exist");
  }
  return JSON.parse(text);
}

async function fetchSourceFromExplorer(
  baseUrl: string,
  address: string
): Promise<string | null> {
  // ── 1. Blockscout v2 native API (primary — works on 0G's chainscan) ──
  try {
    const data = (await safeJsonFetch(`${baseUrl}/api/v2/smart-contracts/${address}`)) as {
      source_code?: string;
      additional_sources?: { file_name: string; source_code: string }[];
    };

    if (data?.source_code?.trim()) {
      const parts: string[] = [data.source_code];
      for (const extra of data.additional_sources ?? []) {
        parts.push(`// ${extra.file_name}\n${extra.source_code}`);
      }
      return parts.join("\n\n");
    }
  } catch {
    // v2 not available or contract not verified — try Etherscan-compatible API
  }

  // ── 2. Etherscan-compatible API (fallback) ──
  try {
    const data = (await safeJsonFetch(
      `${baseUrl}/api?module=contract&action=getsourcecode&address=${address}`
    )) as { status?: string; result?: { SourceCode?: string }[] };

    const raw = data?.result?.[0]?.SourceCode ?? "";
    if (data?.status === "1" && raw.trim() && raw !== "Contract source code not verified") {
      return raw;
    }
  } catch {
    // not available
  }

  return null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";

  if (!/^0x[0-9a-fA-F]{40}$/i.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  for (const baseUrl of EXPLORERS) {
    const sourceCode = await fetchSourceFromExplorer(baseUrl, address);
    if (sourceCode) {
      return NextResponse.json({ sourceCode, explorer: baseUrl });
    }
  }

  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

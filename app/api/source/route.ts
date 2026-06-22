import { NextRequest, NextResponse } from "next/server";

const EXPLORERS = [
  "https://chainscan-galileo.0g.ai", // testnet
  "https://chainscan.0g.ai",         // mainnet
];

async function fetchSource(baseUrl: string, address: string): Promise<{
  sourceCode: string | null;
  error: string | null;
}> {
  const url = `${baseUrl}/api?module=contract&action=getsourcecode&address=${address}`;

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    return { sourceCode: null, error: "timeout" };
  }

  const text = await res.text();

  // Explorer returned HTML (404 page, maintenance page, etc.) — not a JSON API response
  if (text.trimStart().startsWith("<")) {
    return { sourceCode: null, error: "html" };
  }

  let data: { status?: string; result?: { SourceCode?: string }[] };
  try {
    data = JSON.parse(text);
  } catch {
    return { sourceCode: null, error: "invalid_json" };
  }

  const rawSource = data?.result?.[0]?.SourceCode ?? "";

  if (
    data.status !== "1" ||
    !rawSource.trim() ||
    rawSource === "Contract source code not verified"
  ) {
    return { sourceCode: null, error: "unverified" };
  }

  return { sourceCode: rawSource, error: null };
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";

  if (!/^0x[0-9a-fA-F]{40}$/i.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  for (const baseUrl of EXPLORERS) {
    const { sourceCode, error } = await fetchSource(baseUrl, address);

    if (sourceCode) {
      return NextResponse.json({ sourceCode, explorer: baseUrl });
    }

    // Only continue to next explorer for errors that mean "not here"
    if (error === "unverified" || error === "html" || error === "timeout" || error === "invalid_json") {
      continue;
    }
  }

  // Both explorers exhausted
  return NextResponse.json(
    { error: "not_found" },
    { status: 404 }
  );
}

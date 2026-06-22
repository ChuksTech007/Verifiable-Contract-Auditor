import { JsonRpcProvider, Wallet, Contract, parseEther } from "ethers";
// Default import forces CJS resolution on Vercel — the ESM build re-exports from
// a CJS bundle and Node.js can't resolve its named exports in an ESM context.
import zgSdk from "@0gfoundation/0g-compute-ts-sdk";
const { createZGComputeNetworkBroker } = zgSdk as typeof import("@0gfoundation/0g-compute-ts-sdk");
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const RPC_URL      = "https://evmrpc-testnet.0g.ai";
const LEDGER_CA    = "0xE70830508dAc0A97e6c087c75f402f9Be669E406";
const INFERENCE_CA = "0xa79F4c8311FF93C06b8CfB403690cc987c93F91E";

const BALANCE_UPDATED_ABI = [
  "event BalanceUpdated(address indexed user, address indexed provider, uint256 amount, uint256 pendingRefund)",
];

const SYSTEM_PROMPT = `You are an expert smart contract security auditor specializing in Solidity.
Analyze the provided code and return a JSON object matching this shape exactly:
{
  "findings": [
    {
      "severity": "high" | "medium" | "low",
      "title": "Short vulnerability name",
      "explanation": "One or two sentences describing the issue and its impact."
    }
  ]
}

Check for: reentrancy, unchecked external calls, integer overflow/underflow, access control issues,
tx.origin misuse, front-running, uninitialized storage pointers, and any other security concerns.
If the code has no vulnerabilities, return an empty findings array.`;

export async function POST(req: NextRequest) {
  const { code } = await req.json();

  if (!code?.trim()) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const provider = new JsonRpcProvider(RPC_URL);
  const wallet   = new Wallet(process.env.OG_PRIVATE_KEY!, provider);
  const broker   = await createZGComputeNetworkBroker(wallet);

  // Ensure ledger exists — create/fund if first use
  try {
    await broker.ledger.getLedger();
  } catch {
    const ledgerContract = new Contract(
      LEDGER_CA,
      ["function depositFund() payable"],
      wallet
    );
    await ledgerContract.depositFund({ value: parseEther("0.5") });
  }

  // Pick chatbot service
  const services = await broker.inference.listService();
  const service  = services.find(s => s.serviceType === "chatbot") ?? services[0];

  if (!service) {
    return NextResponse.json(
      { error: "No inference services found on 0G network" },
      { status: 503 }
    );
  }

  const providerAddress = service.provider;

  // Acknowledge TEE signer (no-op if already done)
  try {
    await broker.inference.acknowledgeProviderSigner(providerAddress);
  } catch { /* already acknowledged */ }

  const { endpoint, model } =
    await broker.inference.getServiceMetadata(providerAddress);

  const userContent = `Audit this Solidity contract:\n\n\`\`\`solidity\n${code}\n\`\`\``;

  // Bypass SDK's hardcoded 2 A0GI inline check — sub-account is pre-funded via topup.mjs
  await broker.inference.startAutoFunding(providerAddress, { bufferMultiplier: 0 });

  const billingHeaders = await broker.inference.getRequestHeaders(
    providerAddress,
    userContent
  );

  const openai = new OpenAI({ baseURL: endpoint, apiKey: "placeholder" });
  const completion = await openai.chat.completions.create(
    {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userContent },
      ],
    },
    { headers: { ...billingHeaders } }
  );

  const responseText = completion.choices[0]?.message?.content ?? "";
  const chatID =
    (completion as unknown as { headers?: Record<string, string> }).headers?.[
      "ZG-Res-Key"
    ] ?? completion.id;

  let teeVerified: boolean | null = null;
  try {
    teeVerified = await broker.inference.processResponse(
      providerAddress,
      chatID,
      JSON.stringify(completion.usage)
    );
  } catch {
    // TEE signature fetch failed — findings are still valid, badge won't show
  }
  console.log("[0G Audit] processResponse result:", teeVerified);

  // Query the inference contract for the most recent BalanceUpdated event
  // for this (user, provider) pair — emitted on fund transfer or provider settlement.
  let txHash: string | null = null;
  try {
    const inferenceContract = new Contract(INFERENCE_CA, BALANCE_UPDATED_ABI, provider);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock    = Math.max(0, currentBlock - 5000);

    const filter = inferenceContract.filters.BalanceUpdated(wallet.address, providerAddress);
    const events = await inferenceContract.queryFilter(filter, fromBlock, "latest");

    console.log("[0G Audit] BalanceUpdated events found:", events.length);
    events.forEach((e, i) =>
      console.log(`  [${i}] block=${e.blockNumber} tx=${e.transactionHash}`)
    );

    if (events.length > 0) {
      txHash = events[events.length - 1].transactionHash;
      console.log("[0G Audit] Using tx hash:", txHash);
    }
  } catch (err) {
    console.log("[0G Audit] Could not fetch BalanceUpdated events:", err);
  }

  const raw = responseText.trim()
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "");

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      ...parsed,
      verified: teeVerified === true,
      txHash,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not parse model response", raw: responseText },
      { status: 500 }
    );
  }
}

# Verifiable Contract Auditor

A smart contract security auditor that uses AI to detect vulnerabilities in Solidity code — with cryptographic proof that the analysis is genuine. Every audit is processed inside a Trusted Execution Environment on 0G's decentralized compute network, so the result can't be faked or tampered with.

---

## The Problem

Existing AI audit tools are black boxes. You paste your contract in, get a list of findings back, and have no way to know whether the AI actually ran, whether the result was cached, altered, or just hallucinated. For security-critical work, "trust me" isn't good enough.

---

## The Solution

This tool routes every audit through 0G Compute Network's TEE (Trusted Execution Environment) infrastructure. The model runs inside an isolated hardware enclave — Intel TDX with dstack verification — and the network produces a cryptographic attestation tied to that specific inference. The result is a verifiable audit: you can prove the AI ran, on your exact input, and the output wasn't touched.

---

## How It Works

1. **Paste** your Solidity contract into the text box
2. **Submit** — the code is sent to an AI model running inside a TEE on 0G Compute Network
3. **The network attests** the inference: a cryptographic signature is generated proving the model ran in a trusted enclave
4. **Findings are displayed** with severity badges (high / medium / low) and short explanations
5. The **"Verified via 0G Compute (TEE)"** badge confirms the result is cryptographically attested

---

## Tech Stack

- **Next.js 15** — frontend and API routes
- **0G Compute Network** — decentralized, TEE-attested AI inference
- **@0gfoundation/0g-compute-ts-sdk** — on-chain billing and request signing
- **Qwen 2.5 Omni 7B** — the model running inside the Trusted Execution Environment
- **Intel TDX + dstack** — hardware-level TEE verification

---

## Getting Started

```bash
git clone <repo>
cd verifiable-contract-auditor
npm install
```

Copy the example env file and fill in your wallet private key:

```bash
cp .env.local.example .env.local
```

Your wallet needs testnet A0GI. Get some at [faucet.0g.ai](https://faucet.0g.ai), then run the setup scripts to fund your on-chain ledger and provider sub-account:

```bash
node create-ledger.mjs   # one-time: creates and funds your ledger
node fund-provider.mjs   # one-time: funds the inference sub-account
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste any Solidity contract, and click **Audit Contract**.

### Environment Variables

| Variable | Description |
|---|---|
| `OG_PRIVATE_KEY` | Private key of the wallet that pays for 0G Compute inference |

See `.env.local.example` for the format.

---

## Built For

**0G Zero Cup — June 2026**

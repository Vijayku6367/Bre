import React, { useState } from "react";
import { ethers } from "ethers";

// Single-file React component (paste into a Next.js / Vercel project page at pages/index.js or app/page.jsx)
// Tailwind classes are used for styling (Vercel + Next.js + Tailwind recommended)

export default function BrevisDeFiDapp() {
  const [wallet, setWallet] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [jobResult, setJobResult] = useState(null);
  const [proofSubmitting, setProofSubmitting] = useState(false);

  const BREVIS_API = process.env.NEXT_PUBLIC_BREVIS_API || "https://demo-brevis-prover.local/prove";
  const AIRDROP_CONTRACT = process.env.NEXT_PUBLIC_AIRDROP_CONTRACT || "0x0000000000000000000000000000000000000000";
  const RPC = process.env.NEXT_PUBLIC_RPC || "https://rpc.your-testnet.io";

  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask or another web3 wallet");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    setWallet({ address, provider, signer });
  }

  // Example: submit a Brevis job to compute distinct dapps count for a wallet in past 365 days
  async function requestProof() {
    if (!wallet) return alert("Connect wallet first");
    setStatus("requesting-proof");
    setMessage("Sending prove job to Brevis prover...");

    try {
      const body = {
        wallet: wallet.address,
        start: Math.floor(Date.now() / 1000) - 365 * 24 * 3600,
        end: Math.floor(Date.now() / 1000),
        filters: {
          minGas: 10000,
          requireStateChange: true
        },
        threshold: 10,
        jobType: "distinct-dapps-count"
      };

      const res = await fetch(BREVIS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        setStatus("error");
        setMessage("Prover error: " + err);
        return;
      }

      const json = await res.json();
      // Expect json: { publicInputs: "0x..", proof: "0x..", outputs: { count, commitment } }
      setJobResult(json);
      setStatus("proof-ready");
      setMessage(`Proof ready (count=${json.outputs?.count}). Click Submit to send on-chain.`);
    } catch (e) {
      setStatus("error");
      setMessage("Request failed: " + e.message);
    }
  }

  // Submit claim transaction to the AirdropEligibility contract
  async function submitClaimOnChain() {
    if (!wallet || !jobResult) return alert("Connect wallet and request proof first");
    setProofSubmitting(true);
    setMessage("Sending claim transaction...");

    try {
      const signer = wallet.signer;
      const abi = [
        "function claim(bytes publicInputs, bytes proof) public"
      ];
      const contract = new ethers.Contract(AIRDROP_CONTRACT, abi, signer);

      // publicInputs should be bytes; backend should return encoded abi bytes
      const publicInputs = jobResult.publicInputs; // "0x..."
      const proof = jobResult.proof; // "0x..."

      const tx = await contract.claim(publicInputs, proof, { gasLimit: 500000 });
      setMessage("Tx sent: " + tx.hash);
      await tx.wait();
      setMessage("Claim verified on-chain — check contract state or token balance.");
      setStatus("claimed");
    } catch (e) {
      setMessage("Claim failed: " + (e.data?.message || e.message));
      setStatus("error");
    } finally {
      setProofSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Brevis-powered DeFi dApp — Airdrop / Credit / Rewards</h1>
          <div>
            {wallet ? (
              <div className="text-sm">Connected: {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}</div>
            ) : (
              <button onClick={connectWallet} className="px-4 py-2 bg-blue-600 text-white rounded">Connect Wallet</button>
            )}
          </div>
        </header>

        <main className="bg-white shadow rounded p-6 space-y-6">
          <section>
            <h2 className="font-medium">Use-case: Sybil-resistant Airdrop (Distinct dApps)</h2>
            <p className="text-sm text-slate-600">This demo asks Brevis to compute whether your wallet interacted with at least <strong>10 distinct dApps</strong> in the past 365 days.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={requestProof} className="px-4 py-2 rounded bg-emerald-500 text-white">Request Proof</button>
              <button onClick={submitClaimOnChain} disabled={!jobResult || proofSubmitting} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">Submit Claim On-chain</button>
            </div>
            <div className="mt-4 text-sm">
              <div>Status: <strong>{status}</strong></div>
              <div className="mt-2 text-slate-700">{message}</div>
            </div>
          </section>

          <section>
            <h3 className="font-medium">Last Job Result</h3>
            <pre className="mt-2 p-3 bg-slate-100 rounded text-xs overflow-auto">{JSON.stringify(jobResult, null, 2)}</pre>
          </section>

          <section>
            <h3 className="font-medium">What you need (backend & deployment)</h3>
            <ol className="mt-2 list-decimal list-inside text-sm text-slate-700 space-y-1">
              <li>Brevis prover endpoint (or mock) that accepts POST /prove and returns {"publicInputs","proof","outputs"}.</li>
              <li>Deployed AirdropEligibility contract address (set NEXT_PUBLIC_AIRDROP_CONTRACT).</li>
              <li>Indexer / archive access for prover (off-chain) so proofs are reproducible.</li>
              <li>Environment variables: NEXT_PUBLIC_BREVIS_API, NEXT_PUBLIC_AIRDROP_CONTRACT, NEXT_PUBLIC_RPC.</li>
            </ol>
          </section>

          <section>
            <h3 className="font-medium">Tips for local testing</h3>
            <ul className="mt-2 list-disc list-inside text-sm text-slate-700 space-y-1">
              <li>Use MockBrevisVerifier and Mock prover returning sample proof/publicInputs matching the Solidity mock verifier.</li>
              <li>Run Hardhat node locally and deploy AirdropEligibility + MockBrevisVerifier from earlier solidity example.</li>
              <li>Set NEXT_PUBLIC_BREVIS_API to a local express server that returns the demo JSON.</li>
            </ul>
          </section>
        </main>

        <footer className="mt-8 text-sm text-slate-500">Built for demo. For production, wire with your Brevis operator and secure server-side prover.</footer>
      </div>
    </div>
  );
    }
            

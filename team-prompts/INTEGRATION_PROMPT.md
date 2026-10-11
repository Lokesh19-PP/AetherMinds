# 🏆 Master Integration Prompt (Use At The Very End)

> **When to use:** Use this prompt **AFTER** Lokesh, Shreyash, Yash, and Sarthak have completed their branch tasks.  
> **Where to run:** On the `main` branch.

---

## 📋 Copy-Paste This Master Prompt into Antigravity:

```text
You are the Technical Lead integrating ProofChain (Problem B-01, Vortexa 3.0).
All 4 team members have completed their tasks on their respective branches:
- Lokesh (Branch: Lokesh): Cryptographic engine, Merkle tree, standalone verifier, verifier CLI, and purity checks.
- Shreyash (Branch: Shreyash): Anchor signed ledger (:4100), Witness watchdog (:4200), Registry DB & API (:4000), FileStore, and drift audit.
- Yash (Branch: Yash): Deterministic AI rules/Naive Bayes, Solidity smart contract (RootAnchor.sol), and CreatorProof backend routes.
- Sarthak (Branch: Sarthak): Web frontend (apps/web), router, Lovable UI components, streaming file hasher, and API wiring.

Execute the following end-to-end integration and verification:

STEP 1: Merge all 4 branches into 'main' cleanly:
- Merge Lokesh: git merge --no-ff Lokesh -m "integration: merge cryptographic engine and verifier (Lokesh)"
- Merge Shreyash: git merge --no-ff Shreyash -m "integration: merge anchor ledger, witness, and registry backend (Shreyash)"
- Merge Yash: git merge --no-ff Yash -m "integration: merge Solidity contract, Hardhat chain, and AI services (Yash)"
- Merge Sarthak: git merge --no-ff Sarthak -m "integration: merge web frontend and Lovable UI components (Sarthak)"

STEP 2: Enforce Verifier Purity:
- Run: npx tsx scripts/checkVerifierPurity.ts
- Ensure packages/core and packages/verifier have ZERO forbidden imports (no express, no sqlite, no zod, no ai, no node:fs).

STEP 3: Deploy Local Blockchain & Setup Environments:
- Compile & deploy Solidity RootAnchor contract to local Hardhat node:
  npx hardhat --tsconfig contracts/hardhat.config.ts run contracts/scripts/deploy.ts
- Run system setup to generate keys, .env, and anchorPub.ts:
  npm run setup
- Seed deterministic fictional batches with fixed PDF timestamps:
  npm run seed

STEP 4: Run Complete Test Suite:
- Run: npm test
- Ensure 100% of tests pass across core, verifier, anchor, witness, registry, contracts, and ai.

STEP 5: Validate Adversarial Tamper Scenarios:
- Execute all tamper cases:
  npm run demo:tamper -- doc-flip      (Must report DOC_MODIFIED)
  npm run demo:tamper -- proof-edit    (Must report ROOT_MISMATCH)
  npm run demo:tamper -- anchor-edit   (Must report ANCHOR_INVALID)
  npm run demo:tamper -- anchor-resign (Must report WITNESS_MISMATCH)
  npm run demo:tamper -- chain-reset   (Must report ANCHOR_DISAGREEMENT)

STEP 6: Launch and Verify Multi-Process Dev Runner:
- Ensure `npm run dev` boots all 5 services concurrently:
  - Vite Web UI on http://localhost:5173
  - Registry API on http://localhost:4000
  - Anchor Ledger on http://localhost:4100
  - Witness Watchdog on http://localhost:4200
  - Hardhat Local Node on http://localhost:8545
- Check GET http://localhost:4000/api/health returns 5 green status checks.

Print the final integration report showing that the complete system is integrated, tested, and ready for the stage presentation.
```

---

## 💾 Final Integration Git Commands:

Run these commands on `main` once Antigravity finishes integration:

```bash
git checkout main
git add .
git commit -m "integration: complete end-to-end integration of Lokesh, Shreyash, Yash, and Sarthak with Lovable UI"
git push origin main
```

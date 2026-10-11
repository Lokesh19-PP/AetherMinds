# 🚀 ProofChain Team Prompts — Quick Start

All files in this folder contain **direct, copy-pasteable prompts** designed to be given to **Antigravity** (or any AI coding assistant) step-by-step, along with the exact Git commit message for each step.

---

## 👥 Members, Branches & Prompt Files

| Member | Assigned Branch | Prompt File | What They Build |
|---|---|---|---|
| **Lokesh** | `Lokesh` | [**`LOKESH_PROMPTS.md`**](./LOKESH_PROMPTS.md) | Cryptographic core, Merkle tree, standalone verifier, verifier CLI, and tamper tests |
| **Shreyash** | `Shreyash` | [**`SHREYASH_PROMPTS.md`**](./SHREYASH_PROMPTS.md) | Anchor signed ledger (:4100), Witness (:4200), Registry DB & API (:4000), FileStore, and drift audit |
| **Yash** | `Yash` | [**`YASH_PROMPTS.md`**](./YASH_PROMPTS.md) | Deterministic AI rules/Naive Bayes, Solidity smart contract (`RootAnchor.sol`), and CreatorProof routes |
| **Sarthak** | `Sarthak` | [**`SARTHAK_PROMPTS.md`**](./SARTHAK_PROMPTS.md) | Frontend web app (`apps/web`), wiring Lovable components, state, client hashing, and APIs |
| **Lovable UI** | `Sarthak` | [**`LOVABLE_PROMPTS.md`**](./LOVABLE_PROMPTS.md) | Ready-to-use Lovable prompts + **exact folder paths** to place the downloaded UI files |
| **Team Lead** | `main` | [**`INTEGRATION_PROMPT.md`**](./INTEGRATION_PROMPT.md) | **Final integration prompt** to paste into Antigravity when all members finish to merge & verify everything |

---

## ⚡ How To Use These Files

1. **Switch to your branch first:**
   ```bash
   git checkout <YourName>
   ```
2. **Open your prompt file:** (e.g. `LOKESH_PROMPTS.md`)
3. **Copy Prompt 1** and paste it directly into Antigravity.
4. Let Antigravity write and test the code.
5. **Run the provided Git commit command** shown below that prompt.
6. **Move to Prompt 2**, and repeat until all prompts are complete!
7. When all 4 members are finished, run [**`INTEGRATION_PROMPT.md`**](./INTEGRATION_PROMPT.md) on `main` to merge and launch the entire app.

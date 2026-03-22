---
title: SPL & Utilities
---

# SPL & Utilities

## Well-known program addresses

```ts
import {
  splSystemProgramAddress,
  splAddressLookupProgramAddress,
  splComputeBudgetProgramAddress,
  splTokenProgramAddress,
  splAssociatedTokenProgramAddress,
  splNameServiceProgramAddress,
} from "solana-kiss";
```

| Constant | Address |
|---|---|
| `splSystemProgramAddress` | `111...` (32 × `1`) |
| `splComputeBudgetProgramAddress` | `ComputeBudget111...` |
| `splTokenProgramAddress` | `TokenkegQfeZ...` |
| `splAssociatedTokenProgramAddress` | `ATokenGPvbd...` |

## Lamports & fees

```ts
import {
  approximateSolsForLamports,
  approximateLamportsForSols,
  lamportsRentExemptionMinimumForSpace,
  lamportsFeePerBytePerYear,
  lamportsFeePerSignature,
} from "solana-kiss";

const sols    = approximateSolsForLamports(1_000_000_000n); // → 1.0
const lamports = approximateLamportsForSols(0.5);           // → 500_000_000n

// Minimum balance to keep an account rent-exempt
const min = lamportsRentExemptionMinimumForSpace(165); // for a token account

// Constants
lamportsFeePerBytePerYear; // 3480n
lamportsFeePerSignature;   // 5000n
```

## Explorer URLs

```ts
import {
  urlExplorerAccount,
  urlExplorerBlock,
  urlExplorerTransaction,
  urlExplorerSimulation,
  urlRpcFromUrlOrMoniker,
} from "solana-kiss";

const rpcUrl = urlRpcFromUrlOrMoniker("mainnet");

urlExplorerAccount(rpcUrl, accountAddress);
urlExplorerBlock(rpcUrl, blockSlot);
urlExplorerTransaction(rpcUrl, transactionHandle);
urlExplorerSimulation(rpcUrl, transactionPacket); // inspect without broadcasting
```

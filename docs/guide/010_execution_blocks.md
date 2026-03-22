---
title: Execution & Blocks
---

# Execution & Blocks

## `ExecutionReport`

Returned by `prepareAndExecuteTransaction`, `prepareAndSimulateTransaction`,
and `rpcHttpGetTransaction`. Contains `blockSlot`, `transactionError`,
`transactionLogs`, `consumedComputeUnits`, and `chargedFeesLamports`.

## `ExecutionFlow`

Hierarchical trace of every program invocation, parsed from program logs.
Returned alongside `executionReport` by the same functions.

## Fetch a confirmed transaction

```ts
import { rpcHttpGetTransaction } from "solana-kiss";

const result = await rpcHttpGetTransaction(rpc, transactionHandle);
if (result) {
  const { transactionRequest, executionReport, executionFlow } = result;
}
// Returns undefined when not yet confirmed
```

## Poll until confirmed

```ts
import { rpcHttpWaitForTransaction } from "solana-kiss";

const { executionReport, executionFlow } = await rpcHttpWaitForTransaction(
  rpc,
  transactionHandle,
  async ({ totalDurationMs }) => totalDurationMs < 60_000,
);
```

## Block hash

```ts
import {
  rpcHttpGetLatestBlockHash,
  blockHashFromBase58,
  blockHashDefault,
} from "solana-kiss";

const { blockHash } = await rpcHttpGetLatestBlockHash(rpc);

// Branded constructors
const hash = blockHashFromBase58("4vJ9...");
blockHashDefault; // all-zeroes block hash
```

Block hashes expire after ~150 slots (~90 s). The `Solana` class caches the
latest hash for `recentBlockHashCacheDurationMs` (default 15 s).

## Block content

```ts
import {
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockWithTransactions,
  rpcHttpFindBlocks,
  rpcHttpFindAccountTransactions,
} from "solana-kiss";

const meta  = await rpcHttpGetBlockMetadata(rpc, slot);
const block = await rpcHttpGetBlockWithTransactions(rpc, slot);

// Find up to 100 block slots starting from startSlot
const { blocksSlots } = await rpcHttpFindBlocks(rpc, 100, { lowBlockSlot: startSlot });

// Get the 50 most recent transaction handles for an account
const { newToOldTransactionsHandles } =
  await rpcHttpFindAccountTransactions(rpc, accountAddress, 50);
```

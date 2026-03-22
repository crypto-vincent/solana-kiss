---
title: Execution & Blocks
---

# Execution & Blocks

## `ExecutionReport`

Returned by `waitForTransaction`, `simulateTransaction`, and `getTransaction`.

```ts
type ExecutionReport = {
  blockTime: Date | undefined;
  blockSlot: BlockSlot;
  transactionLogs: string[] | undefined;
  transactionError: null | string | JsonObject; // null = success
  consumedComputeUnits: number;
  chargedFeesLamports: bigint | undefined;
};
```

## `ExecutionFlow`

Hierarchical trace of every program invocation, parsed from the program logs:

```ts
type ExecutionFlow = Array<
  | { invocation: ExecutionInvocation }  // CPI call (nested)
  | { data: Uint8Array }                 // "Program data:" log
  | { log: string }                      // "Program log:" message
  | { unknown: string }
>;
```

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

const { blockHash, lastValidBlockHeight } = await rpcHttpGetLatestBlockHash(rpc);

// Branded constructors
const hash = blockHashFromBase58("4vJ9...");
blockHashDefault; // all-zeroes block hash
```

Block hashes expire after ~150 slots (~90 s). The `Solana` class caches the
latest hash for `recentBlockHashCacheDurationMs` (default 15 s).

## Block slot

```ts
import { blockSlotFromNumber, blockSlotToNumber } from "solana-kiss";

const slot = blockSlotFromNumber(12345678);
```

## Block content

```ts
import {
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockWithTransactions,
  rpcHttpFindBlocks,
  rpcHttpFindAccountTransactions,
} from "solana-kiss";

const meta   = await rpcHttpGetBlockMetadata(rpc, slot);
const block  = await rpcHttpGetBlockWithTransactions(rpc, slot);
const slots  = await rpcHttpFindBlocks(rpc, startSlot, { limit: 100 });
const txRefs = await rpcHttpFindAccountTransactions(rpc, accountAddress, { limit: 50 });
```

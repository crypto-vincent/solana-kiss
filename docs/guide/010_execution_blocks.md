---
title: Execution & Blocks
---

# Execution & Blocks

After a transaction is confirmed you can inspect its execution result through
two complementary views: the flat `ExecutionReport` summary and the structured
`ExecutionFlow` call-stack.

## `ExecutionReport`

```ts
type ExecutionReport = {
  blockTime: Date | undefined;           // wall-clock time of the block
  blockSlot: BlockSlot;                  // slot number
  transactionLogs: string[] | undefined; // raw program log lines
  transactionError: null | string | JsonObject; // null = success
  consumedComputeUnits: number;
  chargedFeesLamports: bigint | undefined;
};
```

A `null` `transactionError` means the transaction succeeded.

## `ExecutionFlow`

The execution flow is a hierarchical trace of every program invocation in the
transaction, parsed from the program log lines:

```ts
type ExecutionFlow = Array<
  | { invocation: ExecutionInvocation }  // nested CPI call
  | { data: Uint8Array }                 // "Program data:" log entry
  | { log: string }                      // "Program log:" message
  | { unknown: string }                  // unrecognised log line
>;

type ExecutionInvocation = {
  instructionRequest: InstructionRequest;
  innerExecutionFlow: ExecutionFlow;      // nested CPIs and logs
  instructionError: string | undefined;   // undefined = success
  instructionReturned: Uint8Array | undefined; // return data bytes
  consumedComputeUnits: number | undefined;
};
```

## Fetching a transaction

```ts
import { rpcHttpGetTransaction } from "solana-kiss";

const result = await rpcHttpGetTransaction(rpc, transactionHandle);
if (result) {
  const { transactionRequest, executionReport, executionFlow } = result;
}
```

Returns `undefined` when the transaction is not yet confirmed.

Pass `{ skipExecutionFlowParsing: true }` to skip parsing the call-stack:

```ts
const result = await rpcHttpGetTransaction(rpc, transactionHandle, {
  skipExecutionFlowParsing: true,
});
```

## Polling until confirmed

```ts
import { rpcHttpWaitForTransaction } from "solana-kiss";

const { transactionRequest, executionReport, executionFlow } =
  await rpcHttpWaitForTransaction(
    rpc,
    transactionHandle,
    async ({ retriedCounter, totalDurationMs }) => {
      // Retry for up to 60 seconds
      return totalDurationMs < 60_000;
    },
  );
```

## `BlockSlot` and `BlockHash`

Both are branded primitives:

```ts
import {
  blockSlotFromNumber, blockSlotToNumber,
  blockHashFromBase58, blockHashFromBytes,
  blockHashToBase58, blockHashToBytes,
  blockHashDefault,
} from "solana-kiss";

const slot = blockSlotFromNumber(12345678);
const hash = blockHashFromBase58("4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi");
```

`blockHashDefault` is the all-zeroes block hash.

## Fetching the latest block hash

```ts
import { rpcHttpGetLatestBlockHash } from "solana-kiss";

const { blockHash, lastValidBlockHeight } =
  await rpcHttpGetLatestBlockHash(rpc);
```

Block hashes expire after roughly 150 slots (~90 seconds). The `Solana` class
caches the latest block hash for `recentBlockHashCacheDurationMs`
(default 15 s) to avoid redundant RPC calls.

## Checking block hash validity

```ts
import { rpcHttpIsBlockHashValid } from "solana-kiss";

const { valid } = await rpcHttpIsBlockHashValid(rpc, blockHash);
```

## Block metadata and content

```ts
import {
  rpcHttpGetBlockMetadata,
  rpcHttpGetBlockTimeOnly,
  rpcHttpGetBlockWithTransactions,
  rpcHttpFindBlocks,
} from "solana-kiss";

// Metadata only (fast)
const meta = await rpcHttpGetBlockMetadata(rpc, blockSlot);

// Just the block time
const { blockTime } = await rpcHttpGetBlockTimeOnly(rpc, blockSlot);

// Full block including all transactions
const block = await rpcHttpGetBlockWithTransactions(rpc, blockSlot);

// Find block slots in a range
const slots = await rpcHttpFindBlocks(rpc, startSlot, { limit: 100 });
```

## Transactions for an address

```ts
import { rpcHttpFindAccountTransactions } from "solana-kiss";

const txs = await rpcHttpFindAccountTransactions(rpc, accountAddress, {
  limit: 50,
});
// → Array<{ transactionHandle, blockSlot, blockTime, transactionError }>
```

## Interpreting the execution flow

```ts
function printFlow(flow: ExecutionFlow, depth = 0) {
  const indent = "  ".repeat(depth);
  for (const entry of flow) {
    if ("invocation" in entry) {
      const inv = entry.invocation;
      console.log(`${indent}[invoke] ${inv.instructionRequest.programAddress}`);
      if (inv.instructionError) {
        console.log(`${indent}  ERROR: ${inv.instructionError}`);
      }
      printFlow(inv.innerExecutionFlow, depth + 1);
    } else if ("log" in entry) {
      console.log(`${indent}[log] ${entry.log}`);
    } else if ("data" in entry) {
      console.log(`${indent}[data] ${entry.data.length} bytes`);
    }
  }
}

printFlow(executionFlow ?? []);
```

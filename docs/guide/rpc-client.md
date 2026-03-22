---
title: RPC Client
---

# RPC Client

The RPC layer is a plain function type with no class hierarchy. You compose
middleware wrappers around a base client to add timeouts, retries, rate
limiting, and concurrency caps.

## The `RpcHttp` type

```ts
type RpcHttp = (
  method: string,
  params: Readonly<JsonArray>,
  config: Readonly<JsonObject> | "skip-configuration-object",
) => Promise<JsonValue>;
```

Every RPC helper in the library (e.g. `rpcHttpSendTransaction`) accepts a
first `RpcHttp` argument, making them composable and testable independently.

## Creating a client

```ts
import { rpcHttpFromUrl } from "solana-kiss";

const rpc = rpcHttpFromUrl(new URL("https://api.mainnet-beta.solana.com"), {
  commitmentLevel: "confirmed",        // default: "confirmed"
  extraRequestHeaders: {               // optional extra headers
    "Authorization": "Bearer mytoken",
  },
});
```

## Middleware wrappers

All wrappers return a new `RpcHttp` and compose with each other.

### Timeout

```ts
import { rpcHttpWithTimeout } from "solana-kiss";

const rpc = rpcHttpWithTimeout(baseRpc, 10_000); // 10 s
```

Rejects with an error if the call does not complete in time.

### Concurrency limit

```ts
import { rpcHttpWithConcurrentRequestsLimit } from "solana-kiss";

const rpc = rpcHttpWithConcurrentRequestsLimit(baseRpc, 5);
// Maximum 5 in-flight requests; extras are queued
```

### Rate limit (requests per second)

```ts
import { rpcHttpWithRequestsPerSecondLimit } from "solana-kiss";

const rpc = rpcHttpWithRequestsPerSecondLimit(baseRpc, 10);
// Maximum 10 RPS
```

### Automatic retry

```ts
import { rpcHttpWithRetryOnError } from "solana-kiss";

const rpc = rpcHttpWithRetryOnError(baseRpc, async ({
  retriedCounter,
  totalDurationMs,
  requestMethod,
  lastError,
}) => {
  if (totalDurationMs > 30_000) return false;   // give up after 30 s
  if (retriedCounter >= 5) return false;         // or 5 retries
  return true;                                   // keep retrying
});
```

### Chaining all middleware

```ts
import {
  rpcHttpFromUrl,
  rpcHttpWithTimeout,
  rpcHttpWithConcurrentRequestsLimit,
  rpcHttpWithRequestsPerSecondLimit,
  rpcHttpWithRetryOnError,
} from "solana-kiss";

const rpc = rpcHttpWithRetryOnError(
  rpcHttpWithTimeout(
    rpcHttpWithConcurrentRequestsLimit(
      rpcHttpWithRequestsPerSecondLimit(
        rpcHttpFromUrl(new URL("https://my-rpc.example.com")),
        40,  // 40 RPS
      ),
      10,    // 10 concurrent
    ),
    5_000,   // 5 s timeout per call
  ),
  async ({ retriedCounter }) => retriedCounter < 3,
);
```

## Error handling

`RpcHttpError` is thrown when the JSON-RPC response contains an error payload:

```ts
import { RpcHttpError } from "solana-kiss";

try {
  await rpcHttpSendTransaction(rpc, packet);
} catch (err) {
  if (err instanceof RpcHttpError) {
    console.error("RPC error", err.code, err.desc, err.data);
  }
}
```

## Low-level RPC helpers

Every helper in the `rpc/` module takes an `RpcHttp` and wraps a specific
Solana JSON-RPC method:

| Function | JSON-RPC method |
|---|---|
| `rpcHttpGetAccountWithData` | `getAccountInfo` |
| `rpcHttpGetAccountMetadata` | `getAccountInfo` (no data) |
| `rpcHttpGetAccountLamports` | `getAccountInfo` (lamports only) |
| `rpcHttpFindProgramOwnedAccounts` | `getProgramAccounts` |
| `rpcHttpFindAccountTransactions` | `getSignaturesForAddress` |
| `rpcHttpFindBlocks` | `getBlocksWithLimit` |
| `rpcHttpGetBlockMetadata` | `getBlock` (metadata only) |
| `rpcHttpGetBlockTimeOnly` | `getBlockTime` |
| `rpcHttpGetBlockWithTransactions` | `getBlock` (full) |
| `rpcHttpGetLatestBlockHash` | `getLatestBlockhash` |
| `rpcHttpIsBlockHashValid` | `isBlockhashValid` |
| `rpcHttpGetTransaction` | `getTransaction` |
| `rpcHttpSendTransaction` | `sendTransaction` |
| `rpcHttpSimulateTransaction` | `simulateTransaction` |
| `rpcHttpWaitForTransaction` | polling via `getTransaction` |

### `rpcHttpGetAccountWithData`

```ts
import { rpcHttpGetAccountWithData } from "solana-kiss";

const { programAddress, accountExecutable, accountLamports, accountData } =
  await rpcHttpGetAccountWithData(rpc, address);
```

Returns zeroed defaults when the account does not exist.

### `rpcHttpSendTransaction`

```ts
import { rpcHttpSendTransaction } from "solana-kiss";

const { transactionHandle } = await rpcHttpSendTransaction(rpc, packet, {
  skipPreflight: false, // default
});
```

### `rpcHttpSimulateTransaction`

```ts
import { rpcHttpSimulateTransaction } from "solana-kiss";

const { executionReport, simulatedAccountsByAddress } =
  await rpcHttpSimulateTransaction(rpc, packet, {
    verifySignaturesAndBlockHash: false, // skip sig/blockhash check
    simulatedAccountsAddresses: new Set([addr1, addr2]), // up to 3
  });
```

### `rpcHttpWaitForTransaction`

Polls until the transaction appears on-chain:

```ts
import { rpcHttpWaitForTransaction } from "solana-kiss";

const { transactionRequest, executionReport, executionFlow } =
  await rpcHttpWaitForTransaction(
    rpc,
    transactionHandle,
    async ({ retriedCounter, totalDurationMs }) => {
      return totalDurationMs < 60_000;
    },
  );
```

### `rpcHttpFindProgramOwnedAccounts`

```ts
import { rpcHttpFindProgramOwnedAccounts } from "solana-kiss";

const accounts = await rpcHttpFindProgramOwnedAccounts(rpc, programAddress, {
  dataSpace: 165,                               // exact byte size
  dataBlobs: [{ offset: 0, bytes: discBytes }], // up to 4 byte patterns
});
// → Array<{ accountAddress, accountExecutable, accountLamports, accountSpace }>
```

## Custom JSON fetcher

By default the library uses the global `fetch`. Provide a custom implementation
to intercept or mock requests:

```ts
import type { JsonFetcher } from "solana-kiss";

const mockFetcher: JsonFetcher = async (url, init) => {
  // return a fixed JSON value for testing
  return { jsonrpc: "2.0", id: 1, result: null };
};

const rpc = rpcHttpFromUrl(new URL("..."), { customJsonFetcher: mockFetcher });
```

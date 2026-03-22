---
title: RPC Client
---

# RPC Client

The RPC layer is a composable function type — no class hierarchy. Wrap a base
client with middleware to add timeouts, retries, rate-limiting, and concurrency
caps.

## Create a client

```ts
import { rpcHttpFromUrl } from "solana-kiss";

const rpc = rpcHttpFromUrl(new URL("https://api.mainnet-beta.solana.com"), {
  commitmentLevel: "confirmed",        // default
  extraRequestHeaders: { "Authorization": "Bearer mytoken" },
});
```

## Middleware

```ts
import {
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
        40,     // 40 RPS
      ),
      10,       // 10 concurrent requests
    ),
    5_000,      // 5 s timeout per call
  ),
  async ({ retriedCounter, totalDurationMs }) => {
    return totalDurationMs < 30_000 && retriedCounter < 5;
  },
);
```

## Error handling

```ts
import { RpcHttpError } from "solana-kiss";

try {
  await rpcHttpSendTransaction(rpc, packet);
} catch (err) {
  if (err instanceof RpcHttpError) {
    console.error(err.code, err.desc, err.data);
  }
}
```

## RPC helper reference

Every helper accepts `RpcHttp` as its first argument:

| Function | JSON-RPC method |
|---|---|
| `rpcHttpGetAccountWithData` | `getAccountInfo` |
| `rpcHttpGetAccountMetadata` | `getAccountInfo` (no data) |
| `rpcHttpGetAccountLamports` | `getAccountInfo` (lamports only) |
| `rpcHttpFindProgramOwnedAccounts` | `getProgramAccounts` |
| `rpcHttpFindAccountTransactions` | `getSignaturesForAddress` |
| `rpcHttpFindBlocks` | `getBlocksWithLimit` |
| `rpcHttpGetBlockMetadata` | `getBlock` (metadata only) |
| `rpcHttpGetBlockWithTransactions` | `getBlock` (full) |
| `rpcHttpGetBlockTimeOnly` | `getBlockTime` |
| `rpcHttpGetLatestBlockHash` | `getLatestBlockhash` |
| `rpcHttpIsBlockHashValid` | `isBlockhashValid` |
| `rpcHttpGetTransaction` | `getTransaction` |
| `rpcHttpSendTransaction` | `sendTransaction` |
| `rpcHttpSimulateTransaction` | `simulateTransaction` |
| `rpcHttpWaitForTransaction` | polling via `getTransaction` |

## `RpcHttp` type

```ts
type RpcHttp = (
  method: string,
  params: Readonly<JsonArray>,
  config: Readonly<JsonObject> | "skip-configuration-object",
) => Promise<JsonValue>;
```

Every helper accepts a plain `RpcHttp`, making them easy to test with a mock.

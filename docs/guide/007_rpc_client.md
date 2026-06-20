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
  commitmentLevel: "confirmed", // default
  extraRequestHeaders: { Authorization: "Bearer mytoken" },
});
```

## Middleware

```ts
import {
  rpcHttpWithTimeout,
  rpcHttpWithConcurrentRequestsLimit,
  rpcHttpWithRequestsPerSecondLimit,
  rpcHttpWithRetryOnError,
  rpcHttpWithServerRateLimitRespect,
} from "solana-kiss";

let rpc: RpcHttp = rpcHttpFromUrl(new URL("https://my-rpc.example.com"));
rpc = rpcHttpWithTimeout(rpc, 5_000);
rpc = rpcHttpWithRequestsPerSecondLimit(rpc, 40);
rpc = rpcHttpWithConcurrentRequestsLimit(rpc, 10);
rpc = rpcHttpWithServerRateLimitRespect(rpc);
rpc = rpcHttpWithRetryOnError(
  rpc,
  async function ({ retriedCounter, totalDurationMs }) {
    return totalDurationMs < 30_000 && retriedCounter < 5;
  },
);
```

`rpcHttpWithServerRateLimitRespect` catches HTTP `429 Too Many Requests`
responses, waits for the `retry-after` header when present, and otherwise waits
one second before retrying. `new Solana("mainnet")`, `new Solana("devnet")`, and
URL-based `Solana` instances apply this wrapper automatically.

## Error handling

```ts
import { RpcHttpFetchError, RpcHttpSolanaError } from "solana-kiss";

try {
  await rpcHttpSendTransaction(rpc, packet);
} catch (err) {
  if (err instanceof RpcHttpSolanaError) {
    console.error(err.code, err.desc, err.data);
  } else if (err instanceof RpcHttpFetchError) {
    console.error(err.status, err.headers);
  }
}
```

`RpcHttpSolanaError` represents a JSON-RPC error payload returned by the Solana
node. `RpcHttpFetchError` represents a non-2xx HTTP response before a JSON-RPC
payload could be accepted.

## RPC helper reference

Every helper accepts `RpcHttp` as its first argument:

| Function                          | JSON-RPC method                  |
| --------------------------------- | -------------------------------- |
| `rpcHttpGetAccountWithData`       | `getAccountInfo`                 |
| `rpcHttpGetAccountMetadata`       | `getAccountInfo` (no data)       |
| `rpcHttpGetAccountLamports`       | `getAccountInfo` (lamports only) |
| `rpcHttpFindProgramOwnedAccounts` | `getProgramAccounts`             |
| `rpcHttpFindAccountTransactions`  | `getSignaturesForAddress`        |
| `rpcHttpFindBlocks`               | `getBlocksWithLimit`             |
| `rpcHttpGetBlockMetadata`         | `getBlock` (metadata only)       |
| `rpcHttpGetBlockWithTransactions` | `getBlock` (full)                |
| `rpcHttpGetBlockTimeOnly`         | `getBlockTime`                   |
| `rpcHttpGetLatestBlockHash`       | `getLatestBlockhash`             |
| `rpcHttpIsBlockHashValid`         | `isBlockhashValid`               |
| `rpcHttpGetTransaction`           | `getTransaction`                 |
| `rpcHttpSendTransaction`          | `sendTransaction`                |
| `rpcHttpSimulateTransaction`      | `simulateTransaction`            |
| `rpcHttpWaitForTransaction`       | polling via `getTransaction`     |

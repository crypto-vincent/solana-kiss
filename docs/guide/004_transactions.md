---
title: Transactions
---

# Transactions

A Solana transaction is compiled from a `TransactionRequest`, signed into a
`TransactionPacket`, and broadcast to the network.

## Key types

| Type | Description |
|---|---|
| `TransactionRequest` | Payer + block hash + ordered instructions |
| `TransactionPacket` | Fully serialised wire-ready bytes |
| `TransactionHandle` | Base58 signature used as the transaction's on-chain ID |

## Compile and sign

```ts
import { transactionCompileAndSign } from "solana-kiss";

const packet = await transactionCompileAndSign(
  [signer],      // Array<Signer | WalletAccount>
  request,
  addressLookupTables, // optional ALTs
);
```

## Send and confirm (low-level)

```ts
import {
  rpcHttpSendTransaction,
  rpcHttpWaitForTransaction,
  rpcHttpGetLatestBlockHash,
} from "solana-kiss";

const rpc = solana.getRpcHttp();
const { blockHash } = await rpcHttpGetLatestBlockHash(rpc);

const request: TransactionRequest = {
  payerAddress: signer.address,
  recentBlockHash: blockHash,
  instructionsRequests: [myInstruction],
};

const packet = await transactionCompileAndSign([signer], request);
const { transactionHandle } = await rpcHttpSendTransaction(rpc, packet);

const { executionReport } = await rpcHttpWaitForTransaction(
  rpc,
  transactionHandle,
  async ({ totalDurationMs }) => totalDurationMs < 60_000,
);
```

> **Tip:** The `Solana` class wraps all of the above into
> `buildAndSignTransaction` + `sendTransaction` + `waitForTransaction`.
> Prefer it for most use cases.

## Compile without signing

```ts
import { transactionCompileUnsigned, transactionSign } from "solana-kiss";

const unsigned = transactionCompileUnsigned(request);     // throws if > 1232 bytes
const signed   = await transactionSign(unsigned, [signer]);
```

## Verify signatures

```ts
import { transactionVerify } from "solana-kiss";

await transactionVerify(signedPacket); // throws on invalid signature
```

## Transaction handle

`TransactionHandle` is the base58-encoded first signature — Solana's on-chain
transaction ID.

```ts
import { transactionHandleFromBase58, transactionHandleToBase58 } from "solana-kiss";

const handle = transactionHandleFromBase58("5xHe...");
```

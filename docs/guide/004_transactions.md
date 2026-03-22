---
title: Transactions
---

# Transactions

A Solana transaction is compiled from a `TransactionRequest`, signed into a
`TransactionPacket`, and broadcast to the network.

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

> **Tip:** The `Solana` class wraps all of the above into a single
> `prepareAndExecuteTransaction` call. Prefer it for most use cases.

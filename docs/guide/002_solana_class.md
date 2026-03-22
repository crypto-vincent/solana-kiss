---
title: The Solana Class
---

# The `Solana` Class

`Solana` is the main entry point. It wraps an RPC client and an IDL loader,
and exposes everything you need for the most common on-chain operations.

## Create an instance

```ts
import { Solana } from "solana-kiss";

const solana = new Solana("mainnet");           // public endpoint
const solana = new Solana("devnet");
const solana = new Solana("http://localhost:8899");

// Custom RPC with middleware
import { rpcHttpFromUrl, rpcHttpWithRetryOnError } from "solana-kiss";
const rpc = rpcHttpWithRetryOnError(
  rpcHttpFromUrl(new URL("https://my-rpc.example.com")),
  async ({ retriedCounter }) => retriedCounter < 3,
);
const solana = new Solana(rpc);
```

Optional constructor options:

| Option | Default | Description |
|---|---|---|
| `idlLoader` | built-in chain | Override the IDL loading strategy |
| `idlOverrides` | — | Hard-code IDLs per program (useful in tests) |
| `recentBlockHashCacheDurationMs` | `15000` | How long to cache the latest block hash |

## Decode an account

```ts
const { accountState } = await solana.getAndInferAndDecodeAccount(accountAddress);
```

Fetches the account, auto-detects its type via the owning program's IDL, and
decodes its binary state into a JS value.

## Build and send a transaction

```ts
import { signerFromSecret } from "solana-kiss";

const signer = await signerFromSecret(secretBytes);

// 1. Encode instruction (IDL-aware)
const { instructionRequest } = await solana.encodeInstruction(
  programAddress,
  "transfer",
  { source, destination, authority },
  { amount: 1_000_000n },
);

// 2. Build, sign
const { transactionPacket } = await solana.buildAndSignTransaction(
  [signer],
  [instructionRequest],
  { payerAddress: signer.address },
);

// 3. Send
const { transactionHandle } = await solana.sendTransaction(transactionPacket);

// 4. Wait for confirmation
const { executionReport } = await solana.waitForTransaction(
  transactionHandle,
  async ({ totalDurationMs }) => totalDurationMs < 60_000,
);

if (executionReport.transactionError) {
  console.error("Failed:", executionReport.transactionError);
} else {
  console.log("Confirmed in slot", executionReport.blockSlot);
}
```

## Simulate before sending

```ts
const { executionReport } = await solana.simulateTransaction(transactionPacket);
```

## IDL access

```ts
// Load and cache a program's IDL
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);

// Pin a specific IDL for a program (bypasses the loader)
solana.setProgramIdlOverride(programAddress, myIdl);
solana.setProgramIdlOverride(programAddress, undefined); // remove

// Decode a raw instruction
const { instructionIdl, instructionAddresses, instructionPayload } =
  await solana.inferAndDecodeInstruction(instructionRequest);
```

## PDAs

```ts
const pdaAddress = await solana.findPdaAddress(
  programAddress,
  "userAccount",
  { user: walletAddress },
);
```

## Program-owned accounts

```ts
const accounts = await solana.findProgramOwnedAccounts(programAddress, {
  dataSpace: 165,
  dataBlobs: [{ offset: 0, bytes: discriminatorBytes }],
});
```

## Access the underlying RPC client

```ts
const rpc = solana.getRpcHttp();
```

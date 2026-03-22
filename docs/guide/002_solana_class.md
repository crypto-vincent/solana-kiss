---
title: The Solana Class
---

# The `Solana` Class

`Solana` is the highest-level entry point in the library. It wraps an RPC HTTP
client and an IDL loader, and exposes a rich API for the most common
on-chain operations.

## Constructor

```ts
new Solana(
  rpcHttpOrUrl: RpcHttp | URL | "mainnet" | "devnet" | "testnet" | string,
  options?: {
    idlLoader?: IdlLoader;
    idlOverrides?: Map<Pubkey, Readonly<IdlProgram>>;
    recentBlockHashCacheDurationMs?: number; // default: 15 000
  }
)
```

| Parameter | Description |
|---|---|
| `rpcHttpOrUrl` | An existing `RpcHttp`, a `URL`, or a cluster moniker. |
| `idlLoader` | Custom IDL loader (overrides the built-in on-chain → GitHub fallback chain). |
| `idlOverrides` | Per-program IDLs that bypass the loader entirely. |
| `recentBlockHashCacheDurationMs` | How long to cache the latest block hash (default 15 s). |

## Account methods

### `getAndInferAndDecodeAccount`

Fetches an account, auto-detects its type using the owning program's IDL, and
decodes its state.

```ts
const {
  programAddress,   // Pubkey of the owning program
  programIdl,       // resolved IdlProgram
  accountIdl,       // inferred IdlAccount definition
  accountLamports,  // bigint
  accountExecutable,// boolean
  accountData,      // Uint8Array (raw bytes)
  accountState,     // decoded JS value
} = await solana.getAndInferAndDecodeAccount(accountAddress);
```

### `getOrLoadProgramIdl`

Returns the IDL for a program. Checks in-memory overrides first, then falls
back to the configured `IdlLoader`.

```ts
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);

// Never throw – return an "unknown" stub instead:
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress, {
  fallbackOnUnknown: true,
});
```

### `setProgramIdlOverride`

Registers (or removes) a hard-coded IDL for a specific program, bypassing the
loader for that program on all future calls.

```ts
solana.setProgramIdlOverride(programAddress, myIdl);

// Remove the override:
solana.setProgramIdlOverride(programAddress, undefined);
```

## Instruction methods

### `getOrLoadInstructionIdl`

Loads the IDL for a single instruction of a program.

```ts
const { instructionIdl } = await solana.getOrLoadInstructionIdl(
  programAddress,
  "initialize",
);
```

### `encodeInstruction`

Builds an `InstructionRequest` from named account addresses and a JSON
argument payload.

```ts
const { instructionRequest } = await solana.encodeInstruction(
  programAddress,
  "transfer",
  {
    // Named accounts matching the IDL definition
    source: senderAddress,
    destination: receiverAddress,
    authority: signerAddress,
  },
  {
    // Instruction arguments
    amount: 1_000_000n,
  },
);
```

### `inferAndDecodeInstruction`

Identifies which instruction a raw `InstructionRequest` matches and decodes
both its accounts and payload.

```ts
const {
  instructionIdl,
  instructionAddresses,
  instructionPayload,
} = await solana.inferAndDecodeInstruction(instructionRequest);
```

## PDA method

### `findPdaAddress`

Looks up a named PDA from the program's IDL and derives its address.

```ts
const pdaAddress = await solana.findPdaAddress(
  programAddress,
  "userAccount",
  { user: walletAddress },
);
```

## Transaction methods

### `buildAndSignTransaction`

Compiles and signs a transaction in one call.

```ts
const { transactionPacket } = await solana.buildAndSignTransaction(
  [signer],
  [instructionRequest],
  { payerAddress: signer.address },
);
```

### `sendTransaction`

Broadcasts a signed `TransactionPacket`.

```ts
const { transactionHandle } = await solana.sendTransaction(transactionPacket);
```

### `simulateTransaction`

Simulates a transaction without broadcasting it.

```ts
const { executionReport, simulatedAccountsByAddress } =
  await solana.simulateTransaction(transactionPacket, {
    simulatedAccountsAddresses: new Set([accountAddress]),
  });
```

### `waitForTransaction`

Polls until the transaction is confirmed on-chain (with a user-controlled retry callback).

```ts
const { transactionRequest, executionReport, executionFlow } =
  await solana.waitForTransaction(transactionHandle, async ({ retriedCounter }) => {
    return retriedCounter < 30; // retry up to 30 times
  });
```

## Program-owned accounts

### `findProgramOwnedAccounts`

Fetches all accounts owned by a program, with optional data-size and
memory-pattern filters.

```ts
const accounts = await solana.findProgramOwnedAccounts(programAddress, {
  dataSpace: 165,
  dataBlobs: [{ offset: 0, bytes: discriminatorBytes }],
});
```

## Accessing the underlying RPC client

```ts
const rpc = solana.getRpcHttp();
```

## Full send-and-confirm example

```ts
import {
  Solana,
  signerFromSecret,
  pubkeyFromBase58,
} from "solana-kiss";

const solana = new Solana("devnet");
const signer = await signerFromSecret(secretBytes);

// 1. Build the instruction
const { instructionRequest } = await solana.encodeInstruction(
  programAddress,
  "do_something",
  { target: targetAddress },
  { value: 42n },
);

// 2. Build, sign, send, and wait
const { transactionPacket } = await solana.buildAndSignTransaction(
  [signer],
  [instructionRequest],
  { payerAddress: signer.address },
);
const { transactionHandle } = await solana.sendTransaction(transactionPacket);
const { executionReport } = await solana.waitForTransaction(
  transactionHandle,
  async ({ retriedCounter, totalDurationMs }) => {
    return totalDurationMs < 60_000; // wait up to 60 s
  },
);

if (executionReport.transactionError) {
  console.error("Transaction failed:", executionReport.transactionError);
} else {
  console.log("Transaction confirmed in slot", executionReport.blockSlot);
}
```

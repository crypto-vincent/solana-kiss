---
title: Instructions
---

# Instructions

An instruction describes a single operation to be executed by an on-chain
program. Transactions carry one or more instructions.

## Core types

### `InstructionRequest`

```ts
type InstructionRequest = {
  programAddress: Pubkey;           // the program to invoke
  instructionInputs: InstructionInput[]; // ordered account list
  instructionData: Uint8Array;      // encoded arguments (incl. discriminator)
};
```

### `InstructionInput`

```ts
type InstructionInput = {
  address: Pubkey;
  signer: boolean;   // account must sign the transaction
  writable: boolean; // instruction may modify this account
};
```

## Building instructions manually

When you don't have an IDL you can construct an `InstructionRequest` by hand:

```ts
import { pubkeyFromBase58 } from "solana-kiss";
import type { InstructionRequest } from "solana-kiss";

const ix: InstructionRequest = {
  programAddress: pubkeyFromBase58("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  instructionInputs: [
    { address: sourceTokenAccount, signer: false, writable: true },
    { address: destinationTokenAccount, signer: false, writable: true },
    { address: ownerAddress, signer: true, writable: false },
  ],
  instructionData: encodedTransferArgs,
};
```

## Building instructions with the IDL

When you have an `IdlInstruction` (loaded via the `Solana` class or directly
from the IDL sub-system), use the encode helper:

```ts
import { idlInstructionAccountsEncode, idlInstructionArgsEncode } from "solana-kiss";

// Encode accounts
const { instructionInputs } = idlInstructionAccountsEncode(instructionIdl, {
  source: sourceTokenAccount,
  destination: destinationTokenAccount,
  authority: ownerAddress,
});

// Encode arguments
const { instructionData } = idlInstructionArgsEncode(instructionIdl, {
  amount: 1_000_000n,
});

const ix: InstructionRequest = {
  programAddress,
  instructionInputs,
  instructionData,
};
```

## Decoding instructions

Given a raw `InstructionRequest` (e.g. parsed from a confirmed transaction),
you can decode it back to named accounts and a payload:

```ts
import { idlInstructionAccountsDecode, idlInstructionArgsDecode } from "solana-kiss";

const { instructionAddresses } = idlInstructionAccountsDecode(
  instructionIdl,
  ix.instructionInputs,
);
// → { source: Pubkey, destination: Pubkey, authority: Pubkey }

const { instructionPayload } = idlInstructionArgsDecode(
  instructionIdl,
  ix.instructionData,
);
// → { amount: 1000000n }
```

## Auto-resolved accounts (blobs)

Some accounts have well-known, fixed addresses (e.g. System Program,
Token Program). The IDL can declare these as `IdlInstructionBlob` values so
callers never need to pass them explicitly.

```ts
import { idlInstructionAccountsFind } from "solana-kiss";

// Looks up any auto-resolvable account addresses not yet provided by the caller
const { instructionBlobAddresses } = await idlInstructionAccountsFind(
  instructionIdl,
  { source: sourceTokenAccount },
  fetchAccountData, // (address: Pubkey) => Promise<Uint8Array>
);
```

## Checking instructions

Before encoding you can validate whether an instruction's accounts and
argument data are consistent with its IDL definition:

```ts
import {
  idlInstructionAccountsCheck,
  idlInstructionArgsCheck,
} from "solana-kiss";

idlInstructionAccountsCheck(instructionIdl, instructionInputs);
idlInstructionArgsCheck(instructionIdl, instructionData);
```

Both functions throw a descriptive error on mismatch.

## Using `Solana.encodeInstruction`

The `Solana` class wraps everything above into a single convenient call:

```ts
const { instructionRequest } = await solana.encodeInstruction(
  programAddress,
  "transfer",
  { source, destination, authority },
  { amount: 1_000_000n },
);
```

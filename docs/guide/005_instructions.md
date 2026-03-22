---
title: Instructions
---

# Instructions

An instruction describes a single operation for an on-chain program.
Transactions carry one or more instructions.

## Core types

```ts
type InstructionRequest = {
  programAddress: Pubkey;
  instructionInputs: InstructionInput[];  // ordered account list
  instructionData: Uint8Array;            // encoded args + discriminator
};

type InstructionInput = {
  address: Pubkey;
  signer: boolean;
  writable: boolean;
};
```

## Build with an IDL

The easiest way — used by `Solana.hydrateAndEncodeInstruction` internally:

```ts
import { idlInstructionAccountsEncode, idlInstructionArgsEncode } from "solana-kiss";

const { instructionInputs } = idlInstructionAccountsEncode(instructionIdl, {
  source: sourceTokenAccount,
  destination: destinationTokenAccount,
  authority: ownerAddress,
});

const { instructionData } = idlInstructionArgsEncode(instructionIdl, {
  amount: 1_000_000n,
});

const ix: InstructionRequest = { programAddress, instructionInputs, instructionData };
```

## Build without an IDL

```ts
const ix: InstructionRequest = {
  programAddress: pubkeyFromBase58("TokenkegQ..."),
  instructionInputs: [
    { address: sourceTokenAccount, signer: false, writable: true },
    { address: destinationTokenAccount, signer: false, writable: true },
    { address: ownerAddress, signer: true, writable: false },
  ],
  instructionData: encodedArgs,
};
```

## Decode a raw instruction

```ts
import { idlInstructionAccountsDecode, idlInstructionArgsDecode } from "solana-kiss";

const { instructionAddresses } = idlInstructionAccountsDecode(instructionIdl, ix.instructionInputs);
// → { source: Pubkey, destination: Pubkey, authority: Pubkey }

const { instructionPayload } = idlInstructionArgsDecode(instructionIdl, ix.instructionData);
// → { amount: 1000000n }
```

## Via `Solana.hydrateAndEncodeInstruction` (recommended)

```ts
const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
  programAddress,
  "transfer",
  {
    instructionAddresses: { source, destination, authority },
    instructionPayload: { amount: 1_000_000n },
  },
);
```

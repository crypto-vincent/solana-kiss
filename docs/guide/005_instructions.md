---
title: Instructions
---

# Instructions

An instruction describes a single operation for an on-chain program.
Transactions carry one or more instructions.

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

---
title: IDL Programs
---

# IDL Programs

solana-kiss loads, parses, and caches **Anchor-compatible IDLs**. The parsed
`IdlProgram` is the source of truth for encoding/decoding instructions,
accounts, events, and PDAs.

## Parse from JSON

```ts
import { idlProgramParse } from "solana-kiss";

const idl = idlProgramParse(rawJson); // accepts a plain JS object
```

## Built-in loaders

```ts
import {
  idlLoaderFromOnchainNative,  // newer Anchor native storage
  idlLoaderFromOnchainAnchor,  // legacy Anchor IDL account
  idlLoaderFromUrl,            // fetch from a URL
  idlLoaderFromLoaderSequence, // try loaders in order
  idlLoaderMemoized,           // cache results in memory
} from "solana-kiss";

// Recommended composition (same as what Solana class uses by default)
const loader = idlLoaderMemoized(
  idlLoaderFromLoaderSequence([
    idlLoaderFromOnchainNative(rpc),
    idlLoaderFromOnchainAnchor(rpc),
    idlLoaderFromUrl((addr) => new URL(`https://idls.example.com/${addr}.json`)),
  ]),
);
```

## Via `Solana` class (recommended)

```ts
// Load and cache on demand
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);

// Pin a specific IDL (useful in tests)
solana.setProgramIdlOverride(programAddress, myIdl);
```

## Guess account / instruction type

```ts
import {
  idlProgramGuessAccount,
  idlProgramGuessInstruction,
  idlProgramGuessEvent,
  idlProgramGuessError,
} from "solana-kiss";

const accountIdl     = idlProgramGuessAccount(programIdl, accountDataBytes);
const instructionIdl = idlProgramGuessInstruction(programIdl, instructionRequest);
const eventIdl       = idlProgramGuessEvent(programIdl, eventDataBytes);
const errorIdl       = idlProgramGuessError(programIdl, errorCode);
```

All functions match by discriminator prefix.

## `IdlProgram` structure

```ts
type IdlProgram = {
  metadata:     IdlMetadata;
  typedefs:     Map<string, IdlTypedef>;
  accounts:     Map<string, IdlAccount>;
  instructions: Map<string, IdlInstruction>; // snake_case keys
  events:       Map<string, IdlEvent>;
  errors:       Map<string, IdlError>;
  pdas:         Map<string, IdlPda>;
  constants:    Map<string, IdlConstant>;
  original:     IdlProgramOriginal;          // raw JSON access
};
```

## Unknown-program stub

When no IDL is available:

```ts
import { idlProgramUnknown } from "solana-kiss";

const unknownIdl = await idlProgramUnknown(programAddress);
// Accepts any data without schema constraints.
```

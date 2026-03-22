---
title: IDL Programs
---

# IDL Programs

solana-kiss can load, parse, and cache **Anchor-compatible IDLs** for any
on-chain program. The parsed `IdlProgram` is the source of truth for encoding
and decoding instructions, accounts, events, and PDAs.

## `IdlProgram` structure

```ts
type IdlProgram = {
  metadata:     IdlMetadata;                   // name, version, address, source URL
  typedefs:     Map<string, IdlTypedef>;       // shared type definitions
  accounts:     Map<string, IdlAccount>;       // account layouts
  instructions: Map<string, IdlInstruction>;   // instruction definitions (snake_case keys)
  events:       Map<string, IdlEvent>;         // event definitions
  errors:       Map<string, IdlError>;         // error code definitions
  pdas:         Map<string, IdlPda>;           // PDA definitions
  constants:    Map<string, IdlConstant>;      // program constants
  original:     IdlProgramOriginal;            // raw JSON access
};
```

## Parsing an IDL from JSON

```ts
import { idlProgramParse } from "solana-kiss";

const idl = idlProgramParse(rawJson);
// rawJson can be a JS object, not just a serialised string
```

Both the Anchor array-of-objects style and the Anchor map-of-objects style
are supported.

## The `IdlLoader` type

```ts
type IdlLoader = (programAddress: Pubkey) => Promise<Readonly<IdlProgram>>;
```

Loaders are just async functions — they compose easily.

### Built-in loaders

#### On-chain Anchor IDL

```ts
import { idlLoaderFromOnchainAnchor } from "solana-kiss";

const loader = idlLoaderFromOnchainAnchor(rpcHttp);
```

Reads the IDL from the program's dedicated Anchor IDL account
(`IdlAccount` PDA at `[program_address, b"anchor:idl"]`).

#### On-chain native IDL

```ts
import { idlLoaderFromOnchainNative } from "solana-kiss";

const loader = idlLoaderFromOnchainNative(rpcHttp);
```

Reads from the native IDL storage format used by newer Anchor versions.

#### From a URL

```ts
import { idlLoaderFromUrl } from "solana-kiss";

const loader = idlLoaderFromUrl(
  (programAddress) =>
    new URL(`https://idls.example.com/${programAddress}.json`),
);
```

### Composing loaders

#### Try a sequence of loaders

```ts
import { idlLoaderFromLoaderSequence } from "solana-kiss";

const loader = idlLoaderFromLoaderSequence([
  idlLoaderFromOnchainNative(rpc),
  idlLoaderFromOnchainAnchor(rpc),
  idlLoaderFromUrl((addr) => new URL(`https://idls.example.com/${addr}.json`)),
]);
```

Falls back to the next loader when the previous one throws.

#### Memoize results

```ts
import { idlLoaderMemoized } from "solana-kiss";

const cachedLoader = idlLoaderMemoized(loader);
// Subsequent calls for the same address return the cached promise immediately.
```

## Using the `Solana` class

The `Solana` constructor uses the recommended sequence
(on-chain native → on-chain Anchor → remote GitHub) by default. You can
override it per-program or globally.

### Per-program override

```ts
// Hard-code a specific IDL for one program (e.g. during testing)
solana.setProgramIdlOverride(programAddress, myIdl);

// Remove the override
solana.setProgramIdlOverride(programAddress, undefined);
```

### Custom loader at construction time

```ts
const solana = new Solana(rpc, {
  idlLoader: myCustomLoader,
});
```

### Loading on demand

```ts
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
```

## Guessing account / instruction types

```ts
import {
  idlProgramGuessAccount,
  idlProgramGuessInstruction,
  idlProgramGuessEvent,
  idlProgramGuessError,
} from "solana-kiss";

// Match raw bytes to the first account type whose discriminator fits
const accountIdl = idlProgramGuessAccount(programIdl, accountDataBytes);

// Match a raw instruction to the first instruction whose discriminator matches
const instructionIdl = idlProgramGuessInstruction(programIdl, instructionRequest);

// Match raw event bytes
const eventIdl = idlProgramGuessEvent(programIdl, eventDataBytes);

// Look up a numeric error code
const errorIdl = idlProgramGuessError(programIdl, errorCode);
```

## Unknown-program stub

When no IDL is available but you still need to process accounts or
instructions gracefully:

```ts
import { idlProgramUnknown } from "solana-kiss";

const unknownIdl = await idlProgramUnknown(programAddress);
// Contains: UnknownAccount, unknown_instruction, UnknownEvent
// Accepts any data without schema constraints.
```

The stub is memoized per program address.

## Accessing the raw IDL JSON

```ts
const rawJson = programIdl.original.getJson();
```

## Example: decode all accounts owned by a program

```ts
import { Solana, rpcHttpFindProgramOwnedAccounts } from "solana-kiss";

const solana = new Solana("mainnet");
const rpc = solana.getRpcHttp();

const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);

const ownedAccounts = await rpcHttpFindProgramOwnedAccounts(rpc, programAddress);

for (const { accountAddress } of ownedAccounts) {
  const { accountState } = await solana.getAndInferAndDecodeAccount(accountAddress);
  console.log(accountAddress, accountState);
}
```

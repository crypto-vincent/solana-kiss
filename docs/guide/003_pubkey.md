---
title: Public Keys
---

# Public Keys (`Pubkey`)

`Pubkey` is a **branded string** – it's just a base58-encoded 32-byte value at
runtime, but the TypeScript type system prevents you from accidentally mixing
it up with plain strings.

## Creating a `Pubkey`

```ts
import { pubkeyFromBase58, pubkeyFromBytes } from "solana-kiss";

// From a base58 string (e.g. from user input or an API response)
const pk = pubkeyFromBase58("So11111111111111111111111111111111111111112");

// From raw bytes
const pk2 = pubkeyFromBytes(new Uint8Array(32));
```

Both functions throw if the input does not decode to exactly 32 bytes.

## Converting a `Pubkey`

```ts
import { pubkeyToBase58, pubkeyToBytes } from "solana-kiss";

const str: string     = pubkeyToBase58(pk);  // back to base58
const buf: Uint8Array = pubkeyToBytes(pk);   // back to 32 bytes
```

## Default / zero key

```ts
import { pubkeyDefault } from "solana-kiss";
// 11111111111111111111111111111111
```

## Generating a dummy key for tests

```ts
import { pubkeyNewDummy } from "solana-kiss";
const dummy = pubkeyNewDummy(); // random, starts with a fixed 5-byte prefix
```

## Program Derived Addresses (PDAs)

### Basic PDA derivation

```ts
import { pubkeyFindPdaAddress } from "solana-kiss";

const pdaAddress = pubkeyFindPdaAddress(programAddress, [
  Buffer.from("some-seed"),
  pubkeyToBytes(userAddress),
]);
```

### PDA with bump seed

When you also need the bump value (e.g. to store it in an account):

```ts
import { pubkeyFindPdaAddressAndBump } from "solana-kiss";

const { address, bump } = pubkeyFindPdaAddressAndBump(programAddress, [
  Buffer.from("vault"),
]);
```

The function iterates bump values from 255 down to 0 and returns the first
valid off-curve address, matching Solana's `findProgramAddress` semantics.

### `createWithSeed` (owned accounts)

```ts
import { pubkeyCreateFromSeed } from "solana-kiss";

// Equivalent to Solana's createWithSeed / SystemProgram.createAccountWithSeed
const derived = pubkeyCreateFromSeed(baseAddress, "nonce", ownerAddress);
```

Throws if the UTF-8 seed exceeds 32 bytes.

## Curve membership check

```ts
import { pubkeyIsOnCurve } from "solana-kiss";

// PDAs must be OFF the curve
if (!pubkeyIsOnCurve(pdaAddress)) {
  console.log("Valid PDA candidate");
}
```

The check is a pure-JS Ed25519 field-arithmetic implementation – no native
crypto required.

## Signature verification

```ts
import { pubkeyToVerifier } from "solana-kiss";

const verify = await pubkeyToVerifier(signerPublicKey);
const ok = await verify(signature, messageBytes);
```

## Why a branded type?

Because `Pubkey` is `Branded<string, "Pubkey">`, TypeScript rejects raw
strings wherever a `Pubkey` is expected:

```ts
// ✗ type error — plain string is not Pubkey
const bad: Pubkey = "So11111111111111111111111111111111111111112";

// ✓ correct
const good: Pubkey = pubkeyFromBase58("So11111111111111111111111111111111111111112");
```

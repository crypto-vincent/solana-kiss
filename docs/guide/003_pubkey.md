---
title: Public Keys
---

# Public Keys (`Pubkey`)

`Pubkey` is a **branded string** — base58-encoded 32 bytes. The TypeScript
type system prevents mixing it up with plain strings.

## Create and convert

```ts
import { pubkeyFromBase58, pubkeyFromBytes, pubkeyToBase58, pubkeyToBytes } from "solana-kiss";

const pk  = pubkeyFromBase58("So11111111111111111111111111111111111111112");
const pk2 = pubkeyFromBytes(new Uint8Array(32));

const str: string     = pubkeyToBase58(pk);
const buf: Uint8Array = pubkeyToBytes(pk);
```

Both `from*` functions throw if the input does not decode to exactly 32 bytes.

## Special values

```ts
import { pubkeyDefault, pubkeyNewDummy } from "solana-kiss";

pubkeyDefault;     // 11111111111111111111111111111111 (all zeros, a const)
pubkeyNewDummy();  // random key for tests
```

## Program Derived Addresses (PDAs)

```ts
import { pubkeyFindPdaAddress, pubkeyFindPdaAddressAndBump } from "solana-kiss";

// Derive a PDA
const pdaAddress = pubkeyFindPdaAddress(programAddress, [
  Buffer.from("some-seed"),
  pubkeyToBytes(userAddress),
]);

// Derive with bump (needed when storing the bump in the account)
const { address, bump } = pubkeyFindPdaAddressAndBump(programAddress, [
  Buffer.from("vault"),
]);
```

## `createWithSeed` (owned accounts)

```ts
import { pubkeyCreateFromSeed } from "solana-kiss";

const derived = pubkeyCreateFromSeed(baseAddress, "nonce", ownerAddress);
// Throws if seed exceeds 32 UTF-8 bytes
```

## Curve check

```ts
import { pubkeyIsOnCurve } from "solana-kiss";

// PDAs must be off the curve
if (!pubkeyIsOnCurve(candidate)) {
  console.log("Valid PDA candidate");
}
```

## Signature verification

```ts
import { pubkeyToVerifier } from "solana-kiss";

const verify = await pubkeyToVerifier(signerPublicKey);
const ok = await verify(signature, messageBytes);
```

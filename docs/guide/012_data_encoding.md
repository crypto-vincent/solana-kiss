---
title: Data Encoding
---

# Data Encoding

Zero-dependency codecs for all encodings used on Solana.

## Base58

```ts
import { base58Encode, base58Decode, base58BytesLength } from "solana-kiss";

const encoded = base58Encode(bytes);
const decoded = base58Decode(encoded);
const len     = base58BytesLength(encoded); // byte length without decoding
```

## Base64

```ts
import { base64Encode, base64Decode } from "solana-kiss";
```

## Base16 (hex)

```ts
import { base16Encode, base16Decode } from "solana-kiss";

const hex = base16Encode(bytes); // lowercase
```

## UTF-8

```ts
import { utf8Encode, utf8Decode } from "solana-kiss";
```

## SHA-256

```ts
import { sha256Hash } from "solana-kiss";

// Accepts an array of byte arrays (concatenated before hashing)
const digest = sha256Hash([utf8Encode("global:initialize")]);
```

Used internally to derive Anchor discriminators. Pure-JS, no native crypto.

## Branded types

All serialised primitives are **branded** to prevent accidental misuse at
compile time:

| Type | Underlying | Description |
|---|---|---|
| `Pubkey` | `string` | Base58-encoded 32-byte public key |
| `BlockHash` | `string` | Base58-encoded 32-byte block hash |
| `TransactionHandle` | `string` | Base58-encoded 64-byte signature |
| `Signature` | `Uint8Array` | 64-byte Ed25519 signature |
| `TransactionPacket` | `Uint8Array` | Full wire-format transaction bytes |
| `BlockSlot` | `number` | Solana slot number |

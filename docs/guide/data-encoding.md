---
title: Data Encoding
---

# Data Encoding Utilities

solana-kiss ships lightweight, zero-dependency codec helpers for all the
encodings used on Solana.

## Base58

The default encoding for public keys, signatures, and transaction handles.

```ts
import { base58Encode, base58Decode, base58BytesLength } from "solana-kiss";

const encoded: string    = base58Encode(new Uint8Array([0, 1, 2, 3]));
const decoded: Uint8Array = base58Decode(encoded);

// Fast path: check how many bytes the encoded string decodes to
// without actually decoding it (useful for length validation).
const byteLength: number = base58BytesLength(encoded);
```

## Base64

Used for account data and transaction payloads in JSON-RPC calls.

```ts
import { base64Encode, base64Decode } from "solana-kiss";

const encoded: string    = base64Encode(bytes);
const decoded: Uint8Array = base64Decode(encoded);
```

## Base16 (hexadecimal)

```ts
import { base16Encode, base16Decode } from "solana-kiss";

const hex: string        = base16Encode(bytes);   // lowercase hex
const decoded: Uint8Array = base16Decode(hex);
```

## UTF-8

```ts
import { utf8Encode, utf8Decode } from "solana-kiss";

const bytes: Uint8Array = utf8Encode("hello");
const str: string       = utf8Decode(bytes);
```

## SHA-256

```ts
import { sha256Hash } from "solana-kiss";

// Accepts an array of byte arrays; they are hashed as one concatenated buffer.
const digest: Uint8Array = sha256Hash([
  utf8Encode("global:initialize"),
]);
```

This is a pure-JS implementation — no native crypto required. It is used
internally to derive Anchor discriminators.

## Branded types recap

All the serialised primitives in the library are **branded** wrapper types
that prevent accidental misuse:

| Type | Underlying | Description |
|---|---|---|
| `Pubkey` | `string` | Base58-encoded 32-byte public key |
| `BlockHash` | `string` | Base58-encoded 32-byte block hash |
| `TransactionHandle` | `string` | Base58-encoded 64-byte transaction signature |
| `Signature` | `Uint8Array` | 64-byte Ed25519 signature |
| `TransactionMessage` | `Uint8Array` | Serialised transaction message bytes |
| `TransactionPacket` | `Uint8Array` | Full wire-format transaction bytes |
| `BlockSlot` | `number` | Solana slot number |

Branded types are created via the dedicated constructor functions and can be
unwrapped with the corresponding `*ToBytes` / `*ToBase58` / `*ToNumber` helpers:

```ts
import {
  pubkeyFromBase58,    pubkeyToBase58,    pubkeyToBytes,
  blockHashFromBase58, blockHashToBase58, blockHashToBytes,
  signatureFromBytes,  signatureToBytes,
  transactionHandleFromBase58, transactionHandleToBase58,
  blockSlotFromNumber, blockSlotToNumber,
} from "solana-kiss";
```

## The `Branded<T, Tag>` utility type

```ts
type Branded<Underlying, Tag> = Underlying & { __brand: Tag };
```

This pattern provides nominal typing on top of structural TypeScript types,
ensuring that `Pubkey` and `BlockHash` (both `string` at runtime) are never
accidentally mixed up at compile time.

## JSON codec infrastructure

Internally, solana-kiss uses a rich JSON codec system with typed decoder and
encoder functions. You can use the primitives if you need to write custom
decoders:

```ts
import {
  jsonCodecNumber,
  jsonCodecString,
  jsonCodecBoolean,
  jsonCodecPubkey,
  jsonCodecBlockSlot,
  jsonCodecBlockHash,
  jsonCodecSignature,
  jsonCodecTransactionHandle,
  jsonDecoderObjectToObject,
  jsonDecoderArrayToArray,
  jsonDecoderNullable,
  jsonDecoderConst,
} from "solana-kiss";

// Decode a nested JSON structure
const decoder = jsonDecoderObjectToObject({
  slot: jsonCodecBlockSlot.decoder,
  hash: jsonCodecBlockHash.decoder,
  owner: jsonCodecPubkey.decoder,
});

const result = decoder(rawJsonValue);
// → { slot: BlockSlot, hash: BlockHash, owner: Pubkey }
```

### `JsonFetcher`

A typed `fetch` wrapper used by `rpcHttpFromUrl` and `idlLoaderFromUrl`:

```ts
type JsonFetcher = (url: URL, init?: RequestInit) => Promise<JsonValue>;
```

The default implementation uses the global `fetch`. Override it to mock RPC
calls in tests or to add custom authentication logic:

```ts
import { jsonFetcherDefault } from "solana-kiss";
import type { JsonFetcher } from "solana-kiss";

const loggingFetcher: JsonFetcher = async (url, init) => {
  console.log("→", url.toString());
  const result = await jsonFetcherDefault(url, init);
  console.log("←", JSON.stringify(result).slice(0, 80));
  return result;
};
```

## Inflate (zlib decompression)

Some on-chain IDL data is stored as zlib-compressed bytes. The library
decompresses these automatically using a bundled UZIP implementation:

```ts
import { inflateBytes } from "solana-kiss";

const decompressed = inflateBytes(compressedBytes);
```

---
title: IDL Types
---

# IDL Types

solana-kiss uses a two-stage type representation:

| Stage | Type | Description |
|---|---|---|
| Flat | `IdlTypeFlat` | Unresolved – typedef references are still by name. |
| Full | `IdlTypeFull` | Fully resolved – all typedef links are followed and generics substituted. |

Encoding and decoding always work on `IdlTypeFull`.

## `IdlTypeFlat` variants

Each variant is a tagged union constructed with static factories:

| Variant | Description |
|---|---|
| `defined` | Reference to a named typedef |
| `generic` | A generic type parameter symbol |
| `option` | Optional value with a presence prefix |
| `vec` | Variable-length array with a length prefix |
| `loop` | Sentinel-terminated or end-of-buffer sequence |
| `array` | Fixed-length array |
| `string` | Length-prefixed UTF-8 string |
| `struct` | Named or unnamed fields |
| `enum` | Discriminated union with variants |
| `padded` | Padding before/after an inner type |
| `blob` | Raw fixed bytes (used for discriminators) |
| `const` | Compile-time numeric literal |
| `primitive` | `u8`, `u16`, `u32`, `u64`, `u128`, `i8`, `i16`, `i32`, `i64`, `i128`, `f32`, `f64`, `bool`, `pubkey`, `bytes` |

## `IdlTypeFull` variants

`IdlTypeFull` mirrors `IdlTypeFlat` but with all typedef references resolved:

```
typedef / option / vec / loop / array / string /
struct / enum / padded / blob / primitive
```

## Traversal

Both `IdlTypeFlat` and `IdlTypeFull` expose a `traverse()` method to
dispatch on the active variant:

```ts
const result = typeFull.traverse({
  primitive: (p) => `primitive:${p}`,
  string: (s) => `string(prefix=${s.prefix})`,
  vec: (v) => `vec of ${v.items.traverse(...)}`,
  // … handle every variant, or use a catch-all:
  _: () => "other",
});
```

## Hydrating (flat → full)

```ts
import { idlTypeFlatHydrate, idlTypeFlatFieldsHydrate } from "solana-kiss";

const typeFull = idlTypeFlatHydrate(typeFlat, typedefsMap);
const fullFields = idlTypeFlatFieldsHydrate(flatFields, typedefsMap);
```

## Parsing from IDL JSON

```ts
import { idlTypeFlatParse, idlTypeFlatFieldsParse } from "solana-kiss";

const typeFlat = idlTypeFlatParse(rawJsonValue);
const flatFields = idlTypeFlatFieldsParse(rawFieldsArray);
```

## Encoding

```ts
import { idlTypeFullEncode, idlTypeFullFieldsEncode } from "solana-kiss";

// Encode a single value
const bytes: Uint8Array = idlTypeFullEncode(typeFull, jsonValue);

// Encode struct fields
const fieldBytes: Uint8Array = idlTypeFullFieldsEncode(fullFields, jsonObject);
```

Pass a `discriminator` option to prepend leading bytes (used by accounts):

```ts
const bytes = idlTypeFullEncode(typeFull, value, {
  discriminator: discriminatorBytes,
});
```

## Decoding

```ts
import { idlTypeFullDecode, idlTypeFullFieldsDecode } from "solana-kiss";

const dataView = new DataView(buffer.buffer);

// Returns [nextOffset, decodedValue]
const [offset, value] = idlTypeFullDecode(typeFull, dataView, startOffset);

// Decode multiple named/unnamed fields
const [nextOffset, fieldValues] = idlTypeFullFieldsDecode(fullFields, dataView, 0);
```

## JSON codec

The JSON codec round-trips a typed value through a JSON-compatible form,
useful for serialising decoded account state to JSON:

```ts
import {
  idlTypeFullJsonEncode,
  idlTypeFullJsonDecode,
} from "solana-kiss";

const jsonValue = idlTypeFullJsonEncode(typeFull, decodedValue);
const backAgain = idlTypeFullJsonDecode(typeFull, jsonValue);
```

## Bytemuck support

For programs that use `#[repr(C)]` packed structs, the bytemuck codec skips
padding and alignment bytes:

```ts
import { idlTypeFullBytemuck } from "solana-kiss";

const bytes = idlTypeFullBytemuck(typeFull);
```

## `IdlTypePrimitive` values

```
u8 | u16 | u32 | u64 | u128
i8 | i16 | i32 | i64 | i128
f32 | f64
bool
pubkey
bytes
```

`u64`, `u128`, `i64`, `i128` are decoded as `bigint` values.  
`pubkey` is decoded as a base58 `Pubkey`.  
`bytes` is decoded as a `Uint8Array`.

## `IdlTypePrefix` values

Prefixes control how array lengths, option flags, and enum discriminants are
encoded:

```
u8 | u16 | u32 | u64
```

The default for most contexts is `u32` (4-byte little-endian), matching
Borsh convention.

## Field shapes (`IdlTypeFlatFields` / `IdlTypeFullFields`)

Struct fields come in three shapes:

| Shape | Description |
|---|---|
| `nothing` | Empty struct – no fields |
| `named` | Array of `{ name, docs, typeFlat / typeFull }` |
| `unnamed` | Tuple-like – array of types with no names |

```ts
fullFields.traverse({
  nothing: () => {},
  named: (fields) => {
    for (const f of fields) {
      console.log(f.name, f.typeFull);
    }
  },
  unnamed: (types) => {
    for (const [i, t] of types.entries()) {
      console.log(i, t);
    }
  },
});
```

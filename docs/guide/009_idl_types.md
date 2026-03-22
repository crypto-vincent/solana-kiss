---
title: IDL Types
---

# IDL Types

solana-kiss uses a two-stage type system:

| Stage | Type | Description |
|---|---|---|
| Flat | `IdlTypeFlat` | Unresolved — typedef references still by name |
| Full | `IdlTypeFull` | Fully resolved — all typedef links followed |

Encoding and decoding always work on `IdlTypeFull`.

## Flat type variants

`bool` · `u8/u16/u32/u64/u128` · `i8/i16/i32/i64/i128` · `f32/f64` ·
`pubkey` · `bytes` · `string` · `option` · `vec` · `array` · `struct` ·
`enum` · `defined` (typedef ref) · `padded` · `blob` · `const`

## Traversal

Both types expose a `traverse()` method for exhaustive pattern matching:

```ts
const result = typeFull.traverse({
  primitive: (p) => `primitive:${p}`,
  string:    () => "string",
  vec:       (v) => `vec<${v.items.traverse(...)}>`,
  _:         () => "other",  // catch-all
});
```

## Hydrate (flat → full)

```ts
import { idlTypeFlatHydrate, idlTypeFlatFieldsHydrate } from "solana-kiss";

const typeFull  = idlTypeFlatHydrate(typeFlat, typedefsMap);
const fullFields = idlTypeFlatFieldsHydrate(flatFields, typedefsMap);
```

## Parse from IDL JSON

```ts
import { idlTypeFlatParse, idlTypeFlatFieldsParse } from "solana-kiss";

const typeFlat  = idlTypeFlatParse(rawJsonValue);
const flatFields = idlTypeFlatFieldsParse(rawFieldsArray);
```

## Encode

```ts
import { idlTypeFullEncode, idlTypeFullFieldsEncode } from "solana-kiss";

const bytes      = idlTypeFullEncode(typeFull, value);
const fieldBytes = idlTypeFullFieldsEncode(fullFields, jsObject);

// Prepend a discriminator (e.g. for accounts)
const bytes = idlTypeFullEncode(typeFull, value, { discriminator: discBytes });
```

## Decode

```ts
import { idlTypeFullDecode, idlTypeFullFieldsDecode } from "solana-kiss";

const dataView = new DataView(buffer.buffer);
const [offset, value]       = idlTypeFullDecode(typeFull, dataView, 0);
const [nextOffset, fields]  = idlTypeFullFieldsDecode(fullFields, dataView, 0);
```

## JSON codec (code generation)

`idlTypeFullJsonCodecModule` generates a ready-to-use TypeScript source file
with a typed `jsonCodec` for a given IDL type — useful for build-time
code generation:

```ts
import { idlTypeFullJsonCodecModule } from "solana-kiss";

// Returns a TypeScript module string with a typed `jsonCodec` constant
const tsSource = idlTypeFullJsonCodecModule(typeFull);
```

## Primitive types

`u64`, `u128`, `i64`, `i128` → `bigint`  
`pubkey` → base58 `Pubkey`  
`bytes` → `Uint8Array`

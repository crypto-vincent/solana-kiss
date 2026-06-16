---
title: IDL Types
---

# IDL Types

solana-kiss uses a two-stage type system:

| Stage | Type          | Description                                   |
| ----- | ------------- | --------------------------------------------- |
| Flat  | `IdlTypeFlat` | Unresolved — typedef references still by name |
| Full  | `IdlTypeFull` | Fully resolved — all typedef links followed   |

Encoding and decoding always work on `IdlTypeFull`.

## Encode

```ts
import { idlTypeFullEncode, idlTypeFullFieldsEncode } from "solana-kiss";

const bytes = idlTypeFullEncode(typeFull, value);
const fieldBytes = idlTypeFullFieldsEncode(fullFields, jsObject);

// Prepend a discriminator (e.g. for accounts)
const bytes = idlTypeFullEncode(typeFull, value, { discriminator: discBytes });
```

## Decode

```ts
import { idlTypeFullDecode, idlTypeFullFieldsDecode } from "solana-kiss";

const dataView = new DataView(buffer.buffer);
const [offset, value] = idlTypeFullDecode(typeFull, dataView, 0);
const [nextOffset, fields] = idlTypeFullFieldsDecode(fullFields, dataView, 0);
```

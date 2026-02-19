# Data Module

Low-level utilities for working with Solana data types and primitives.

## Base Encoding

### Base58
```typescript
base58Encode(data: Uint8Array): string
base58Decode(encoded: string): Uint8Array
```
Standard base58 encoding used for Solana addresses and signatures.

### Base64
```typescript
base64Encode(data: Uint8Array): string
base64Decode(encoded: string): Uint8Array
```

### Base16 (Hex)
```typescript
base16Encode(data: Uint8Array): string
base16Decode(encoded: string): Uint8Array
```

## Public Keys

```typescript
type Pubkey = Branded<string, "Pubkey">

pubkeyFromBase58(base58: string): Pubkey
pubkeyToBase58(pubkey: Pubkey): string
pubkeyFromBytes(bytes: Uint8Array): Pubkey
pubkeyToBytes(pubkey: Pubkey): Uint8Array
pubkeyNewDummy(): Pubkey
pubkeyFindPdaAddress(programId: Pubkey, seeds: Array<Uint8Array>): Pubkey
pubkeyCreateFromSeed(fromPublicKey: Pubkey, seed: string, programId: Pubkey): Pubkey
```

**Constants:**
- `pubkeyDefault`: All-zeros pubkey (system program)

## Signatures

```typescript
type Signature = Branded<string, "Signature">

signatureFromBase58(base58: string): Signature
signatureToBase58(signature: Signature): string
signatureFromBytes(bytes: Uint8Array): Signature
signatureToBytes(signature: Signature): Uint8Array
```

## Signers

```typescript
type Signer = {
  address: Pubkey;
  sign: (message: Uint8Array) => Promise<Uint8Array>;
}

signerGenerate(): Promise<Signer>
signerFromSecret(secretKey: Uint8Array): Promise<Signer>
```

## Lamports

```typescript
approximateSolsForLamports(lamports: bigint): number
approximateLamportsForSols(sols: number): bigint
lamportsRentExemptionMinimumForSpace(space: number): bigint
```

**Constants:**
- `lamportsFeePerSignature`: Fee per transaction signature (5000)
- `lamportsFeePerBytePerYear`: Rent cost per byte per year (3480)

## Transactions

```typescript
type TransactionRequest = {
  payerAddress: Pubkey;
  recentBlockHash: BlockHash;
  instructionsRequests: Array<InstructionRequest>;
}

type TransactionPacket = Branded<Uint8Array, "TransactionPacket">

transactionCompileAndSign(
  signers: Array<Signer | WalletAccount>,
  request: TransactionRequest,
  lookupTables?: Array<TransactionAddressLookupTable>
): Promise<TransactionPacket>

transactionSign(
  packet: TransactionPacket,
  signers: Array<Signer | WalletAccount>
): Promise<TransactionPacket>
```

## Instructions

```typescript
type InstructionRequest = {
  programAddress: Pubkey;
  instructionInputs: Array<InstructionInput>;
  instructionData: Uint8Array;
}

type InstructionInput = {
  address: Pubkey;
  isSigner: boolean;
  isWritable: boolean;
}
```

## Blocks

```typescript
type BlockHash = Branded<string, "BlockHash">
type BlockSlot = Branded<number, "BlockSlot">

blockHashFromBytes(bytes: Uint8Array): BlockHash
blockHashToBytes(blockHash: BlockHash): Uint8Array
blockSlotFromNumber(value: number): BlockSlot
blockSlotToNumber(slot: BlockSlot): number
```

**Constants:**
- `blockHashDefault`: All-zeros block hash

## Cryptography

```typescript
sha256Hash(blobs: Array<Uint8Array>): Uint8Array
```

## String Utilities

```typescript
utf8Encode(text: string): Uint8Array
utf8Decode(bytes: Uint8Array): string

casingLosslessConvertToSnake(text: string): string
casingLosslessConvertToCamel(text: string): string
```

## JSON Utilities

```typescript
type JsonValue = JsonPrimitive | JsonArray | JsonObject
type JsonPrimitive = null | boolean | number | string

jsonAsBoolean(value: JsonValue): boolean | undefined
jsonAsString(value: JsonValue): string | undefined
jsonAsNumber(value: JsonValue): number | undefined
jsonAsObject(value: JsonValue): JsonObject | undefined
jsonAsArray(value: JsonValue): JsonArray | undefined

jsonIsDeepEqual(a: JsonValue, b: JsonValue): boolean
jsonIsDeepSubset(subset: JsonValue, superset: JsonValue): boolean
jsonGetAt(value: JsonValue, path: Array<string | number>): JsonValue | undefined

jsonEncode(value: JsonValue, typeFull: IdlTypeFull): Uint8Array
jsonDecode(bytes: Uint8Array, typeFull: IdlTypeFull): JsonValue
```

## URLs

```typescript
urlRpcFromUrlOrMoniker(urlOrMoniker: string): string
urlExplorerAccount(rpc: string, address: Pubkey): string
urlExplorerTransaction(rpc: string, signature: Signature): string
urlExplorerBlock(rpc: string, slot: BlockSlot): string
```

**Constants:**
- `urlRpcPublicMainnet`
- `urlRpcPublicDevnet`
- `urlRpcPublicTestnet`

## Wallet Integration

```typescript
type WalletAccount = {
  address: Pubkey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (packet: TransactionPacket) => Promise<TransactionPacket>;
}

type WalletProvider = {
  name: string;
  icon: string;
  connect: () => Promise<WalletAccount>;
  disconnect: () => Promise<void>;
}

walletProviders: RxObservable<Array<WalletProvider>>
```

## Utilities

```typescript
type Branded<T, Name> = T & { __brand: Name }
type Result<Value, Error> = { ok: Value } | { error: Error }

expectDefined<T>(value: T | undefined, name?: string): T
timeoutMs(durationMs: number): Promise<void>
memoize<In, Out>(fn: (input: In) => Out): (input: In) => Out
```

## Error Handling

```typescript
withErrorContext<T>(message: string, fn: () => T): T

class ErrorStack extends Error {
  stack: Array<string>
}
```

## Compression

```typescript
inflate(bytes: Uint8Array, outputBuffer: Uint8Array | null): Uint8Array
inflateRaw(bytes: Uint8Array, outputBuffer: Uint8Array | null): Uint8Array
```

# Data Module

Low-level utilities. **Simple building blocks.**

## Common Operations

### Public Keys

```typescript
const pubkey = pubkeyFromBase58("11111111111111111111111111111111");
const base58 = pubkeyToBase58(pubkey);
const pda = pubkeyFindPdaAddress(programId, [seed1, seed2]);
```

### Base Encoding

```typescript
const encoded = base58Encode(data);
const decoded = base58Decode(encoded);
```

### Signers

```typescript
const signer = await signerGenerate();              // New keypair
const signer = await signerFromSecret(secretKey);   // From secret
const signature = await signer.sign(message);       // Sign
```

### Lamports

```typescript
const lamports = approximateLamportsForSols(1.5);   // SOL → lamports
const sols = approximateSolsForLamports(1500000000n);  // lamports → SOL
```

### Transactions

```typescript
const tx = await transactionCompileAndSign(signers, request);
const signed = await transactionSign(tx, [signer]);
```

## Reference

### Public Keys
```typescript
pubkeyFromBase58(base58: string): Pubkey
pubkeyToBase58(pubkey: Pubkey): string
pubkeyFromBytes(bytes: Uint8Array): Pubkey
pubkeyToBytes(pubkey: Pubkey): Uint8Array
pubkeyFindPdaAddress(programId: Pubkey, seeds: Array<Uint8Array>): Pubkey
pubkeyCreateFromSeed(from: Pubkey, seed: string, programId: Pubkey): Pubkey
```

**Constants:** `pubkeyDefault` (system program)

### Base Encoding
```typescript
base58Encode(data: Uint8Array): string
base58Decode(encoded: string): Uint8Array
base64Encode(data: Uint8Array): string
base64Decode(encoded: string): Uint8Array
base16Encode(data: Uint8Array): string
base16Decode(encoded: string): Uint8Array
```

### Signatures
```typescript
signatureFromBase58(base58: string): Signature
signatureToBase58(signature: Signature): string
signatureFromBytes(bytes: Uint8Array): Signature
signatureToBytes(signature: Signature): Uint8Array
```

### Signers
```typescript
signerGenerate(): Promise<Signer>
signerFromSecret(secretKey: Uint8Array): Promise<Signer>

type Signer = {
  address: Pubkey;
  sign: (message: Uint8Array) => Promise<Uint8Array>;
}
```

### Lamports
```typescript
approximateSolsForLamports(lamports: bigint): number
approximateLamportsForSols(sols: number): bigint
lamportsRentExemptionMinimumForSpace(space: number): bigint
```

**Constants:** 
- `lamportsFeePerSignature`: 5000
- `lamportsFeePerBytePerYear`: 3480

### Transactions
```typescript
transactionCompileAndSign(
  signers: Array<Signer>,
  request: TransactionRequest,
  lookupTables?: Array<TransactionAddressLookupTable>
): Promise<TransactionPacket>

transactionSign(
  packet: TransactionPacket,
  signers: Array<Signer>
): Promise<TransactionPacket>
```

### Cryptography
```typescript
sha256Hash(blobs: Array<Uint8Array>): Uint8Array
```

### Strings
```typescript
utf8Encode(text: string): Uint8Array
utf8Decode(bytes: Uint8Array): string
```

### JSON
```typescript
jsonIsDeepEqual(a: JsonValue, b: JsonValue): boolean
jsonIsDeepSubset(subset: JsonValue, superset: JsonValue): boolean
jsonGetAt(value: JsonValue, path: Array<string | number>): JsonValue | undefined
```

### URLs
```typescript
urlRpcFromUrlOrMoniker(urlOrMoniker: string): string
urlExplorerAccount(rpc: string, address: Pubkey): string
urlExplorerTransaction(rpc: string, signature: Signature): string
```

**Constants:**
- `urlRpcPublicMainnet`
- `urlRpcPublicDevnet`
- `urlRpcPublicTestnet`

### Utilities
```typescript
timeoutMs(durationMs: number): Promise<void>
expectDefined<T>(value: T | undefined, name?: string): T
```

# IDL Module

Interface Definition Language (IDL) handling for Solana programs.

## IDL Structure

### IdlProgram

```typescript
type IdlProgram = {
  metadata: IdlMetadata;
  typedefs: Map<string, IdlTypedef>;
  accounts: Map<string, IdlAccount>;
  instructions: Map<string, IdlInstruction>;
  events: Map<string, IdlEvent>;
  errors: Map<string, IdlError>;
  pdas: Map<string, IdlPda>;
  constants: Map<string, IdlConstant>;
}

idlProgramParse(idlJson: JsonValue): IdlProgram
idlProgramGuessAccount(program: IdlProgram, accountData: Uint8Array): IdlAccount
idlProgramGuessInstruction(program: IdlProgram, instruction: InstructionRequest): IdlInstruction
idlProgramGuessEvent(program: IdlProgram, eventData: Uint8Array): IdlEvent
idlProgramGuessError(program: IdlProgram, errorCode: number): IdlError
```

Parse and work with program IDLs from JSON.

## IDL Loading

### IdlLoader

```typescript
type IdlLoader = (programAddress: Pubkey) => Promise<IdlProgram>

idlLoaderMemoized(loader: IdlLoader): IdlLoader
idlLoaderFallbackToUnknown(): IdlLoader
idlLoaderFromLoaderSequence(loaders: Array<IdlLoader>): IdlLoader
```

Create custom IDL loading strategies with caching and fallbacks.

### URL Loader

```typescript
idlLoaderFromUrl(
  urlBuilder: (programAddress: Pubkey) => string,
  options?: {
    customFetcher?: (url: string) => Promise<JsonValue>
  }
): IdlLoader
```

Load IDLs from HTTP endpoints.

**Example:**
```typescript
const loader = idlLoaderFromUrl((program) =>
  `https://my-server.com/idls/${program}.json`
);
```

### On-Chain Loaders

```typescript
idlLoaderFromOnchainAnchor(
  accountDataFetcher: (programAddress: Pubkey) => Promise<Uint8Array>
): IdlLoader

idlLoaderFromOnchainNative(
  accountDataFetcher: (programAddress: Pubkey) => Promise<Uint8Array>
): IdlLoader
```

Load IDLs stored on-chain (Anchor programs or native metadata).

## Accounts

### IdlAccount

```typescript
type IdlAccount = {
  name: string;
  docs: IdlDocs;
  typeFull: IdlTypeFull;
  dataBlobs: Array<{ offset: number; bytes: Uint8Array }>;
  dataSpace: number;
}

idlAccountEncode(account: IdlAccount, state: JsonValue): Uint8Array
idlAccountDecode(account: IdlAccount, data: Uint8Array): { accountState: JsonValue }
idlAccountCheck(account: IdlAccount, data: Uint8Array): void
idlAccountParse(name: string, definition: JsonValue, typedefs: Map<string, IdlTypedef>): IdlAccount
```

Encode and decode account data based on IDL definitions.

## Instructions

### IdlInstruction

```typescript
type IdlInstruction = {
  name: string;
  docs: IdlDocs;
  accounts: Array<IdlInstructionAccount>;
  args: Array<{ name: string; type: IdlTypeFlat }>;
  dataPrefix: Uint8Array;
}

type IdlInstructionAddresses = Record<string, Pubkey | undefined>
```

### Encoding/Decoding

```typescript
idlInstructionAccountsEncode(
  instruction: IdlInstruction,
  addresses: IdlInstructionAddresses
): { instructionInputs: Array<InstructionInput> }

idlInstructionAccountsDecode(
  instruction: IdlInstruction,
  inputs: Array<InstructionInput>
): { instructionAddresses: IdlInstructionAddresses }

idlInstructionArgsEncode(
  instruction: IdlInstruction,
  payload: JsonValue
): { instructionData: Uint8Array }

idlInstructionArgsDecode(
  instruction: IdlInstruction,
  data: Uint8Array
): { instructionPayload: JsonValue }
```

### Account Finding

```typescript
idlInstructionAccountsFind(
  instruction: IdlInstruction,
  programAddress: Pubkey,
  options: {
    instructionAddresses?: IdlInstructionAddresses;
    instructionPayload?: JsonValue;
    accountsContext?: IdlInstructionBlobAccountsContext;
    accountFetcher?: IdlInstructionBlobAccountFetcher;
    throwOnMissing?: boolean;
  }
): Promise<{ instructionAddresses: IdlInstructionAddresses }>
```

Automatically resolve missing instruction accounts (PDAs, derived addresses).

## PDAs (Program Derived Addresses)

### IdlPda

```typescript
type IdlPda = {
  name: string;
  docs: IdlDocs;
  seeds: Array<IdlPdaBlob>;
}

type IdlPdaInputs = Record<string, JsonValue>

idlPdaFind(
  pda: IdlPda,
  inputs: IdlPdaInputs,
  programAddress: Pubkey
): { pdaAddress: Pubkey; pdaBump: number }
```

Derive PDA addresses from seed definitions.

**Example:**
```typescript
const { pdaAddress, pdaBump } = idlPdaFind(
  pdaIdl,
  { user: userPubkey, id: 42 },
  programId
);
```

## Events

### IdlEvent

```typescript
type IdlEvent = {
  name: string;
  docs: IdlDocs;
  typeFull: IdlTypeFull;
  dataPrefix: Uint8Array;
}

idlEventEncode(event: IdlEvent, payload: JsonValue): Uint8Array
idlEventDecode(event: IdlEvent, data: Uint8Array): { eventPayload: JsonValue }
idlEventCheck(event: IdlEvent, data: Uint8Array): void
```

Parse program events from logs.

## Errors

### IdlError

```typescript
type IdlError = {
  code: number;
  name: string;
  message: string | undefined;
}
```

Program error definitions.

## Type System

### Type Definitions

```typescript
type IdlTypedef =
  | { kind: "struct"; name: string; fields: Array<IdlTypedField> }
  | { kind: "enum"; name: string; variants: Array<IdlEnumVariant> }

type IdlTypeFull = 
  | { kind: "primitive"; primitive: IdlTypePrimitive }
  | { kind: "struct"; fields: Array<IdlTypedField> }
  | { kind: "enum"; variants: Array<IdlEnumVariant> }
  | { kind: "option"; inner: IdlTypeFull }
  | { kind: "vec"; inner: IdlTypeFull }
  | { kind: "array"; inner: IdlTypeFull; length: number }
```

### Type Operations

```typescript
idlTypeFlatHydrate(
  typeFlat: IdlTypeFlat,
  typedefs: Map<string, IdlTypedef>
): IdlTypeFull

idlTypeFullEncode(typeFull: IdlTypeFull, value: JsonValue): Uint8Array
idlTypeFullDecode(typeFull: IdlTypeFull, bytes: Uint8Array): JsonValue

idlTypeFullBytemuckAlign(typeFull: IdlTypeFull): number
idlTypeFullBytemuckSize(typeFull: IdlTypeFull): number
```

Convert between flat and full type representations, encode/decode values.

## Metadata

```typescript
type IdlMetadata = {
  name: string | undefined;
  description: string | undefined;
  repository: string | undefined;
  contact: string | undefined;
  address: Pubkey;
  version: string | undefined;
  source: string | undefined;
  spec: string | undefined;
  docs: IdlDocs;
}
```

Program metadata from IDL.

## Constants

```typescript
type IdlConstant = {
  name: string;
  type: IdlTypeFlat;
  value: JsonValue;
}
```

Program-defined constants.

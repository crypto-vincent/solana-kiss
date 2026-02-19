# IDL Module

Program interface handling. **Decode everything.**

## Common Operations

### Load IDL

```typescript
const loader = idlLoaderFromUrl((programId) => 
  `https://api.example.com/idl/${programId}.json`
);
const idl = await loader(programAddress);
```

### Decode Account

```typescript
const { accountState } = idlAccountDecode(accountIdl, accountData);
```

### Encode Instruction

```typescript
const { instructionData } = idlInstructionArgsEncode(instructionIdl, payload);
const { instructionInputs } = idlInstructionAccountsEncode(instructionIdl, addresses);
```

### Find PDA

```typescript
const { pdaAddress, pdaBump } = idlPdaFind(pdaIdl, { user: userPubkey }, programId);
```

### Parse IDL

```typescript
const programIdl = idlProgramParse(idlJson);
const accountIdl = idlProgramGuessAccount(programIdl, accountData);
```

## Reference

### IDL Loading

```typescript
idlLoaderFromUrl(urlBuilder: (programId: Pubkey) => string): IdlLoader
idlLoaderFromOnchainAnchor(accountDataFetcher): IdlLoader
idlLoaderFromOnchainNative(accountDataFetcher): IdlLoader
idlLoaderMemoized(loader: IdlLoader): IdlLoader
idlLoaderFromLoaderSequence(loaders: Array<IdlLoader>): IdlLoader
```

### Program IDL

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
idlProgramGuessAccount(program: IdlProgram, data: Uint8Array): IdlAccount
idlProgramGuessInstruction(program: IdlProgram, instruction: InstructionRequest): IdlInstruction
```

### Account Operations

```typescript
idlAccountEncode(account: IdlAccount, state: JsonValue): Uint8Array
idlAccountDecode(account: IdlAccount, data: Uint8Array): { accountState: JsonValue }
idlAccountCheck(account: IdlAccount, data: Uint8Array): void
```

### Instruction Operations

```typescript
idlInstructionArgsEncode(instruction: IdlInstruction, payload: JsonValue): {
  instructionData: Uint8Array;
}

idlInstructionArgsDecode(instruction: IdlInstruction, data: Uint8Array): {
  instructionPayload: JsonValue;
}

idlInstructionAccountsEncode(instruction: IdlInstruction, addresses: IdlInstructionAddresses): {
  instructionInputs: Array<InstructionInput>;
}

idlInstructionAccountsDecode(instruction: IdlInstruction, inputs: Array<InstructionInput>): {
  instructionAddresses: IdlInstructionAddresses;
}

idlInstructionAccountsFind(
  instruction: IdlInstruction,
  programAddress: Pubkey,
  options: {
    instructionAddresses?: IdlInstructionAddresses;
    instructionPayload?: JsonValue;
    accountFetcher?: (address: Pubkey) => Promise<any>;
  }
): Promise<{ instructionAddresses: IdlInstructionAddresses }>
```

### PDA Operations

```typescript
idlPdaFind(
  pda: IdlPda,
  inputs: Record<string, JsonValue>,
  programAddress: Pubkey
): { pdaAddress: Pubkey; pdaBump: number }
```

### Event Operations

```typescript
idlEventEncode(event: IdlEvent, payload: JsonValue): Uint8Array
idlEventDecode(event: IdlEvent, data: Uint8Array): { eventPayload: JsonValue }
idlEventCheck(event: IdlEvent, data: Uint8Array): void
```

### Type System

```typescript
idlTypeFlatHydrate(typeFlat: IdlTypeFlat, typedefs: Map<string, IdlTypedef>): IdlTypeFull
idlTypeFullEncode(typeFull: IdlTypeFull, value: JsonValue): Uint8Array
idlTypeFullDecode(typeFull: IdlTypeFull, bytes: Uint8Array): JsonValue
```

# Solana Class

The `Solana` class provides a high-level wrapper for interacting with the Solana blockchain.

## Constructor

```typescript
new Solana(rpcHttp: RpcHttp | string, options?: {
  customIdlPreload?: Map<Pubkey, IdlProgram>;
  customIdlLoaders?: Array<IdlLoader>;
  recentBlockHashCacheDurationMs?: number;
})
```

**Parameters:**
- `rpcHttp`: RPC endpoint URL (e.g., `"devnet"`, `"mainnet"`) or an `RpcHttp` client
- `options.customIdlPreload`: Pre-cache IDLs for specific programs
- `options.customIdlLoaders`: Custom IDL loading strategies
- `options.recentBlockHashCacheDurationMs`: Blockhash cache duration (default: 15000ms)

**Example:**
```typescript
const solana = new Solana("devnet");
```

## Methods

### `getRpcHttp()`

Returns the underlying RPC client.

```typescript
getRpcHttp(): RpcHttp
```

### `setProgramIdl(programAddress, programIdl)`

Cache or remove an IDL for a program.

```typescript
setProgramIdl(programAddress: Pubkey, programIdl: IdlProgram | undefined): void
```

### `getOrLoadProgramIdl(programAddress)`

Load a program's IDL (with caching).

```typescript
async getOrLoadProgramIdl(programAddress: Pubkey): Promise<{ programIdl: IdlProgram }>
```

### `getAndInferAndDecodeAccount(accountAddress)`

Fetch an account, load its program IDL, and decode the data.

```typescript
async getAndInferAndDecodeAccount(accountAddress: Pubkey): Promise<{
  programAddress: Pubkey;
  programIdl: IdlProgram;
  accountAddress: Pubkey;
  accountIdl: IdlAccount;
  accountLamports: bigint;
  accountExecutable: boolean;
  accountData: Uint8Array;
  accountState: JsonValue;
}>
```

**Example:**
```typescript
const account = await solana.getAndInferAndDecodeAccount(address);
console.log(account.accountState);
```

### `findPdaAddress(programAddress, pdaName, pdaInputs)`

Find a Program Derived Address based on the program's IDL.

```typescript
async findPdaAddress(
  programAddress: Pubkey,
  pdaName: string,
  pdaInputs?: Record<string, JsonValue>
): Promise<{ pdaAddress: Pubkey; pdaBump: number }>
```

### `hydrateAndEncodeInstruction(programAddress, instructionName, options)`

Build an instruction from high-level parameters.

```typescript
async hydrateAndEncodeInstruction(
  programAddress: Pubkey,
  instructionName: string,
  options: {
    instructionAddresses: IdlInstructionAddresses;
    instructionPayload: JsonValue;
    accountsContext?: IdlInstructionBlobAccountsContext;
  }
): Promise<{ instructionRequest: InstructionRequest }>
```

**Example:**
```typescript
const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
  programId,
  "transfer",
  {
    instructionAddresses: { from, to },
    instructionPayload: { amount: "1000" }
  }
);
```

### `inferAndDecodeInstruction(instructionRequest)`

Decode an instruction using the program's IDL.

```typescript
async inferAndDecodeInstruction(
  instructionRequest: InstructionRequest
): Promise<{
  programIdl: IdlProgram;
  instructionIdl: IdlInstruction;
  instructionAddresses: IdlInstructionAddresses;
  instructionPayload: JsonValue;
}>
```

### `prepareAndSendTransaction(payerSigner, instructionsRequests, options)`

Build, sign, and send a transaction.

```typescript
async prepareAndSendTransaction(
  payerSigner: Signer | WalletAccount,
  instructionsRequests: Array<InstructionRequest>,
  options?: {
    extraSigners?: Array<Signer | WalletAccount>;
    transactionLookupTables?: Array<TransactionAddressLookupTable>;
    skipPreflight?: boolean;
  }
): Promise<{ transactionHandle: Signature }>
```

**Example:**
```typescript
const { transactionHandle } = await solana.prepareAndSendTransaction(
  signer,
  [instruction1, instruction2],
  { skipPreflight: false }
);
```

### `prepareAndSimulateTransaction(payer, instructionsRequests, options)`

Simulate a transaction without submitting it.

```typescript
async prepareAndSimulateTransaction(
  payer: Pubkey | Signer | WalletAccount,
  instructionsRequests: Array<InstructionRequest>,
  options?: {
    extraSigners?: Array<Signer | WalletAccount>;
    transactionLookupTables?: Array<TransactionAddressLookupTable>;
    verifySignaturesAndBlockHash?: boolean;
    simulatedAccountsAddresses?: Set<Pubkey>;
  }
): Promise<{
  transactionLogs: Array<string> | null;
  transactionError: JsonValue | null;
  simulatedAccountsStates: Map<Pubkey, Uint8Array>;
}>
```

### `findProgramOwnedAccounts(programAddress, accountName)`

Find all accounts of a specific type owned by a program.

```typescript
async findProgramOwnedAccounts(
  programAddress: Pubkey,
  accountName: string
): Promise<{ accountsAddresses: Set<Pubkey> }>
```

**Example:**
```typescript
const { accountsAddresses } = await solana.findProgramOwnedAccounts(
  programId,
  "TokenAccount"
);
```

### `getRecentBlockHash()`

Get a recent block hash (cached).

```typescript
async getRecentBlockHash(): Promise<BlockHash>
```

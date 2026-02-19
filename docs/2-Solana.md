# Solana Class

High-level wrapper for Solana blockchain interaction. **Keep it simple.**

## Constructor

```typescript
const solana = new Solana("devnet");           // Simple
const solana = new Solana("mainnet");          // Production
const solana = new Solana(customRpcClient);    // Advanced
```

## Common Operations

### Fetch Account

```typescript
const account = await solana.getAndInferAndDecodeAccount(address);
console.log(account.accountState);  // Decoded data
```

### Send Transaction

```typescript
const { transactionHandle } = await solana.prepareAndSendTransaction(
  signer,
  [instruction]
);
```

### Find PDA

```typescript
const { pdaAddress } = await solana.findPdaAddress(
  programId,
  "metadata",
  { mint: mintAddress }
);
```

### Find Program Accounts

```typescript
const { accountsAddresses } = await solana.findProgramOwnedAccounts(
  programId,
  "TokenAccount"
);
```

### Build Instruction

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

### Simulate Transaction

```typescript
const result = await solana.prepareAndSimulateTransaction(signer, [instruction]);
console.log(result.transactionLogs);
```

## All Methods

### `new Solana(rpcHttp, options?)`
- `rpcHttp`: `"devnet"` | `"mainnet"` | `"testnet"` | RpcHttp client
- `options.customIdlPreload`: Pre-cache IDLs
- `options.customIdlLoaders`: Custom IDL loading
- `options.recentBlockHashCacheDurationMs`: Cache duration (default: 15000ms)

### `getAndInferAndDecodeAccount(accountAddress)`
Fetch account, load IDL, decode data. Returns decoded `accountState`.

### `getOrLoadProgramIdl(programAddress)`
Load program IDL with caching.

### `findPdaAddress(programAddress, pdaName, pdaInputs?)`
Find PDA using IDL definition.

### `hydrateAndEncodeInstruction(programAddress, instructionName, options)`
Build instruction from high-level parameters.

### `prepareAndSendTransaction(payerSigner, instructions, options?)`
Build, sign, send transaction.
- `options.extraSigners`: Additional signers
- `options.skipPreflight`: Skip simulation

### `prepareAndSimulateTransaction(payer, instructions, options?)`
Simulate transaction without sending.

### `findProgramOwnedAccounts(programAddress, accountName)`
Find all accounts of specific type owned by program.

### `getRecentBlockHash()`
Get recent blockhash (cached).

### `getRpcHttp()`
Get underlying RPC client.

### `setProgramIdl(programAddress, programIdl?)`
Manually set/clear program IDL cache.

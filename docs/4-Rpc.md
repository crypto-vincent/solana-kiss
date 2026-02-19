# RPC Module

Direct RPC communication. **Low-level control.**

## Common Operations

### Create Client

```typescript
const rpc = rpcHttpFromUrl("https://api.mainnet-beta.solana.com");
const rpc = rpcHttpFromUrl("https://api.devnet.solana.com", {
  commitment: "confirmed"
});
```

### Get Account

```typescript
const { accountData } = await rpcHttpGetAccountWithData(rpc, address);
const { accountLamports } = await rpcHttpGetAccountLamports(rpc, address);
```

### Send Transaction

```typescript
const { transactionHandle } = await rpcHttpSendTransaction(rpc, signedTx);
```

### Simulate Transaction

```typescript
const result = await rpcHttpSimulateTransaction(rpc, tx);
console.log(result.transactionLogs);
```

### Find Accounts

```typescript
const { accountsAddresses } = await rpcHttpFindProgramOwnedAccounts(
  rpc,
  programId,
  { dataSpace: 165 }
);
```

### Get Block Info

```typescript
const { blockHash } = await rpcHttpGetLatestBlockHash(rpc);
const tx = await rpcHttpGetTransaction(rpc, signature);
```

## Reference

### RPC Client

```typescript
rpcHttpFromUrl(url: string, options?: {
  commitment?: "processed" | "confirmed" | "finalized";
  rpcRequestTimeoutMs?: number;
}): RpcHttp

rpcHttpWithTimeout(rpc: RpcHttp, timeoutMs: number): RpcHttp
rpcHttpWithMaxConcurrentRequests(rpc: RpcHttp, max: number): RpcHttp
rpcHttpWithRetryOnError(rpc: RpcHttp, maxRetries: number): RpcHttp
```

### Account Operations

```typescript
rpcHttpGetAccountWithData(rpc: RpcHttp, address: Pubkey): Promise<{
  programAddress: Pubkey;
  accountLamports: bigint;
  accountData: Uint8Array;
}>

rpcHttpGetAccountLamports(rpc: RpcHttp, address: Pubkey): Promise<{
  accountLamports: bigint;
}>

rpcHttpFindProgramOwnedAccounts(
  rpc: RpcHttp,
  programAddress: Pubkey,
  filters?: {
    dataSpace?: number;
    dataBlobs?: Array<{ offset: number; bytes: Uint8Array }>;
  }
): Promise<{ accountsAddresses: Set<Pubkey> }>
```

### Transaction Operations

```typescript
rpcHttpSendTransaction(
  rpc: RpcHttp,
  packet: TransactionPacket,
  options?: { skipPreflight?: boolean }
): Promise<{ transactionHandle: Signature }>

rpcHttpSimulateTransaction(
  rpc: RpcHttp,
  packet: TransactionPacket,
  options?: { simulatedAccountsAddresses?: Set<Pubkey> }
): Promise<{
  transactionLogs: Array<string> | null;
  transactionError: JsonValue | null;
  simulatedAccountsStates: Map<Pubkey, Uint8Array>;
}>

rpcHttpGetTransaction(
  rpc: RpcHttp,
  signature: Signature
): Promise<{
  transactionSlot: BlockSlot | null;
  transactionExecution: { ... } | null;
}>

rpcHttpWaitForTransaction(
  rpc: RpcHttp,
  signature: Signature,
  callback: (context) => Promise<boolean>
): Promise<{ ... }>
```

### Block Operations

```typescript
rpcHttpGetLatestBlockHash(rpc: RpcHttp): Promise<{
  blockHash: BlockHash;
}>

rpcHttpGetBlockMetadata(rpc: RpcHttp, slot: BlockSlot): Promise<{
  blockHash: BlockHash;
  blockTime: number | null;
}>

rpcHttpFindBlocks(
  rpc: RpcHttp,
  startSlot: BlockSlot,
  endSlot: BlockSlot
): Promise<{ blockSlots: Array<BlockSlot> }>
```

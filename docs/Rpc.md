# RPC Module

Direct RPC client functions for communicating with Solana nodes.

## RPC Client

### Creating a Client

```typescript
type RpcHttp = (
  method: string,
  params: Array<any>,
  options?: Record<string, any>
) => Promise<any>

rpcHttpFromUrl(
  url: string,
  options?: {
    commitment?: "processed" | "confirmed" | "finalized";
    rpcRequestTimeoutMs?: number;
  }
): RpcHttp
```

**Example:**
```typescript
import { rpcHttpFromUrl } from "solana-kiss";

const rpc = rpcHttpFromUrl("https://api.mainnet-beta.solana.com", {
  commitment: "confirmed",
  rpcRequestTimeoutMs: 30000
});
```

### Middleware

```typescript
rpcHttpWithTimeout(rpc: RpcHttp, timeoutMs: number): RpcHttp
rpcHttpWithMaxConcurrentRequests(rpc: RpcHttp, maxConcurrent: number): RpcHttp
rpcHttpWithRetryOnError(rpc: RpcHttp, maxRetries: number): RpcHttp
```

## Account Operations

### Get Account Data

```typescript
rpcHttpGetAccountWithData(
  rpc: RpcHttp,
  accountAddress: Pubkey
): Promise<{
  programAddress: Pubkey;
  accountExecutable: boolean;
  accountLamports: bigint;
  accountData: Uint8Array;
}>
```

Fetch complete account data including owner program and lamports.

### Get Account Metadata

```typescript
rpcHttpGetAccountMetadata(
  rpc: RpcHttp,
  accountAddress: Pubkey
): Promise<{
  programAddress: Pubkey;
  accountExecutable: boolean;
  accountLamports: bigint;
  accountSpace: number;
}>
```

Fetch account metadata without downloading the full data.

### Get Account Lamports

```typescript
rpcHttpGetAccountLamports(
  rpc: RpcHttp,
  accountAddress: Pubkey
): Promise<{ accountLamports: bigint }>
```

Fetch only the lamport balance of an account.

### Find Program-Owned Accounts

```typescript
rpcHttpFindProgramOwnedAccounts(
  rpc: RpcHttp,
  programAddress: Pubkey,
  filters?: {
    dataSpace?: number;
    dataBlobs?: Array<{ offset: number; bytes: Uint8Array }>;
  }
): Promise<{ accountsAddresses: Set<Pubkey> }>
```

Find all accounts owned by a program, optionally filtered by size or data patterns.

## Transaction Operations

### Send Transaction

```typescript
rpcHttpSendTransaction(
  rpc: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    skipPreflight?: boolean;
  }
): Promise<{ transactionHandle: Signature }>
```

Submit a signed transaction to the network.

### Simulate Transaction

```typescript
rpcHttpSimulateTransaction(
  rpc: RpcHttp,
  transactionPacket: TransactionPacket,
  options?: {
    simulatedAccountsAddresses?: Set<Pubkey>;
  }
): Promise<{
  transactionLogs: Array<string> | null;
  transactionError: JsonValue | null;
  simulatedAccountsStates: Map<Pubkey, Uint8Array>;
}>
```

Simulate a transaction without submitting it.

### Get Transaction

```typescript
rpcHttpGetTransaction(
  rpc: RpcHttp,
  transactionHandle: Signature,
  options?: {
    includeAccountStates?: boolean;
  }
): Promise<{
  transactionSlot: BlockSlot | null;
  transactionExecution: {
    chargedFeesLamports: bigint;
    transactionLogs: Array<string> | null;
    transactionError: JsonValue | null;
    innerInstructions: Array<InstructionRequest> | null;
  } | null;
  transactionMessage: TransactionMessage | null;
  accountsStates: Map<Pubkey, Uint8Array> | null;
}>
```

Fetch transaction details and execution status.

### Wait for Transaction

```typescript
rpcHttpWaitForTransaction(
  rpc: RpcHttp,
  transactionHandle: Signature,
  callback: (context: {
    totalDurationMs: number;
    pollingIterationCount: number;
  }) => Promise<boolean>
): Promise<{
  transactionSlot: BlockSlot;
  transactionExecution: {
    chargedFeesLamports: bigint;
    transactionLogs: Array<string> | null;
    transactionError: JsonValue | null;
    innerInstructions: Array<InstructionRequest> | null;
  };
}>
```

Poll for transaction confirmation with custom callback control.

### Find Account Transactions

```typescript
rpcHttpFindAccountTransactions(
  rpc: RpcHttp,
  accountAddress: Pubkey,
  options?: {
    limit?: number;
    before?: Signature;
  }
): Promise<{ transactionHandles: Array<Signature> }>
```

Find transaction signatures for an account.

## Block Operations

### Get Latest Block Hash

```typescript
rpcHttpGetLatestBlockHash(
  rpc: RpcHttp
): Promise<{ blockHash: BlockHash }>
```

Fetch a recent block hash for transaction construction.

### Get Block Metadata

```typescript
rpcHttpGetBlockMetadata(
  rpc: RpcHttp,
  blockSlot: BlockSlot
): Promise<{
  blockSlot: BlockSlot;
  blockHash: BlockHash;
  blockTime: number | null;
  blockHeight: number | null;
  parentSlot: BlockSlot;
}>
```

Fetch block metadata by slot number.

### Get Block with Transactions

```typescript
rpcHttpGetBlockWithTransactions(
  rpc: RpcHttp,
  blockSlot: BlockSlot
): Promise<{
  blockSlot: BlockSlot;
  blockHash: BlockHash;
  blockTime: number | null;
  blockHeight: number | null;
  parentSlot: BlockSlot;
  transactionHandles: Array<Signature>;
}>
```

Fetch block information including transaction signatures.

### Get Block Time

```typescript
rpcHttpGetBlockTimeOnly(
  rpc: RpcHttp,
  blockSlot: BlockSlot
): Promise<{ blockTime: number | null }>
```

Fetch only the timestamp of a block.

### Find Blocks

```typescript
rpcHttpFindBlocks(
  rpc: RpcHttp,
  startSlot: BlockSlot,
  endSlot: BlockSlot
): Promise<{ blockSlots: Array<BlockSlot> }>
```

Find all block slots in a range.

## Error Handling

```typescript
class RpcHttpError extends Error {
  code: number;
  data?: any;
}
```

RPC errors include error codes and optional additional data from the node.

# Solana - Keep It Simple, Stupid

No bloat, no dependency, full-featured Solana framework for TypeScript.

## Overview

`solana-kiss` is a lightweight, zero-dependency TypeScript library for interacting with the Solana blockchain. It provides a clean, simple API for common Solana operations without the complexity and size of heavier frameworks.

## Features

- 🚀 **Zero dependencies** - No bloat, just pure functionality
- 📦 **Lightweight** - Minimal package size
- 🔧 **Full-featured** - Complete Solana functionality
- 🎯 **Type-safe** - Written in TypeScript with full type definitions
- 🔌 **IDL Support** - Automatic program IDL loading and decoding
- 💼 **Account Operations** - Easy account fetching and decoding
- 📝 **Transaction Building** - Simple transaction preparation and signing
- 🔍 **Account Queries** - Find program-owned accounts
- 🎨 **PDA Support** - Program Derived Address generation

## Installation

```bash
npm install solana-kiss
```

## Quick Start

### Basic Connection

```typescript
import { Solana } from "solana-kiss";

// Connect to devnet
const solana = new Solana("devnet");

// Or connect to mainnet
const solanaMainnet = new Solana("mainnet");

// Or use a custom RPC URL
const solanaCustom = new Solana("https://api.mainnet-beta.solana.com");
```

### Fetch and Decode an Account

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("devnet");
const accountAddress = pubkeyFromBase58("YourAccountAddressHere");

// Automatically infer the program and decode the account
const account = await solana.getAndInferAndDecodeAccount(accountAddress);

console.log("Program:", account.programAddress);
console.log("Account Type:", account.accountIdl.name);
console.log("Account State:", account.accountState);
console.log("Lamports:", account.accountLamports);
```

### Load Program IDL

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("devnet");
const programAddress = pubkeyFromBase58("YourProgramAddressHere");

// Load the program's IDL
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);

console.log("Program Name:", programIdl.metadata.name);
console.log("Instructions:", [...programIdl.instructions.keys()]);
console.log("Accounts:", [...programIdl.accounts.keys()]);
```

### Prepare and Send a Transaction

```typescript
import {
  Solana,
  signerFromSecret,
  pubkeyDefault,
  pubkeyToBase58,
  signerGenerate,
} from "solana-kiss";

const solana = new Solana("devnet");

// Create a payer signer from a secret key
const payerSigner = await signerFromSecret(yourSecretKey);

// Generate a new account
const newAccountSigner = await signerGenerate();

// Prepare instruction
const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
  pubkeyDefault, // System program
  "create",
  {
    instructionAddresses: {
      payer: payerSigner.address,
      created: newAccountSigner.address,
    },
    instructionPayload: {
      lamports: "1000000",
      space: 42,
      owner: pubkeyToBase58(pubkeyDefault),
    },
  }
);

// Send transaction
const { transactionHandle } = await solana.prepareAndSendTransaction(
  payerSigner,
  [instructionRequest],
  {
    extraSigners: [newAccountSigner],
    skipPreflight: false,
  }
);

console.log("Transaction sent:", transactionHandle);
```

### Find Program-Owned Accounts

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("devnet");
const programAddress = pubkeyFromBase58("YourProgramAddressHere");

// Find all accounts of a specific type owned by the program
const { accountsAddresses } = await solana.findProgramOwnedAccounts(
  programAddress,
  "YourAccountTypeName"
);

console.log(`Found ${accountsAddresses.size} accounts`);

// Fetch and decode each account
for (const accountAddress of accountsAddresses) {
  const account = await solana.getAndInferAndDecodeAccount(accountAddress);
  console.log("Account:", accountAddress);
  console.log("State:", account.accountState);
}
```

### Find PDA Address

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("devnet");
const programAddress = pubkeyFromBase58("YourProgramAddressHere");

// Find a PDA based on the program's IDL definition
const { pdaAddress } = await solana.findPdaAddress(
  programAddress,
  "your_pda_name",
  {
    // PDA seeds based on IDL definition
    user: "UserPublicKeyBase58",
    id: 42,
  }
);

console.log("PDA Address:", pdaAddress);
```

### Simulate a Transaction

```typescript
import { Solana, pubkeyFromBase58, signerFromSecret } from "solana-kiss";

const solana = new Solana("devnet");
const payerSigner = await signerFromSecret(yourSecretKey);

// Simulate without sending
const simulation = await solana.prepareAndSimulateTransaction(
  payerSigner,
  [instructionRequest],
  {
    verifySignaturesAndBlockHash: true,
  }
);

console.log("Simulation logs:", simulation.transactionLogs);
console.log("Simulation error:", simulation.transactionError);
```

## Advanced Usage

### Custom IDL Loaders

You can provide custom IDL loaders to handle specific programs:

```typescript
import {
  Solana,
  rpcHttpFromUrl,
  idlLoaderFromUrl,
  IdlProgram,
} from "solana-kiss";

const customIdlLoader = idlLoaderFromUrl((programAddress) => {
  return `https://your-idl-server.com/${programAddress}.json`;
});

const solana = new Solana("devnet", {
  customIdlLoaders: [customIdlLoader],
});
```

### Preload Program IDLs

For better performance, you can preload program IDLs:

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const programAddress = pubkeyFromBase58("YourProgramAddressHere");
const programIdl = /* ... your IDL object ... */;

const customIdlPreload = new Map();
customIdlPreload.set(programAddress, programIdl);

const solana = new Solana("devnet", {
  customIdlPreload,
});
```

### Custom RPC Configuration

```typescript
import { Solana, rpcHttpFromUrl } from "solana-kiss";

const rpcHttp = rpcHttpFromUrl("https://api.devnet.solana.com", {
  commitment: "confirmed",
  rpcRequestTimeoutMs: 30000,
});

const solana = new Solana(rpcHttp);
```

### Working with Signers

```typescript
import { signerGenerate, signerFromSecret } from "solana-kiss";

// Generate a new random signer
const newSigner = await signerGenerate();
console.log("New address:", newSigner.address);

// Create signer from existing secret key (64 bytes)
const existingSigner = await signerFromSecret(secretKeyUint8Array);

// Sign a message
const message = new Uint8Array([1, 2, 3, 4, 5]);
const signature = await existingSigner.sign(message);
```

## API Reference

### Main Class: `Solana`

#### Constructor

```typescript
new Solana(rpcHttp: RpcHttp | string, options?: {
  customIdlPreload?: Map<Pubkey, IdlProgram>;
  customIdlLoaders?: Array<IdlLoader>;
  recentBlockHashCacheDurationMs?: number;
})
```

#### Methods

- `getOrLoadProgramIdl(programAddress: Pubkey)` - Load or retrieve cached program IDL
- `getAndInferAndDecodeAccount(accountAddress: Pubkey)` - Fetch and decode an account
- `findPdaAddress(programAddress, pdaName, pdaInputs?)` - Find a PDA address
- `hydrateAndEncodeInstruction(programAddress, instructionName, options)` - Prepare an instruction
- `prepareAndSendTransaction(payerSigner, instructionsRequests, options?)` - Send a transaction
- `prepareAndSimulateTransaction(payer, instructionsRequests, options?)` - Simulate a transaction
- `findProgramOwnedAccounts(programAddress, accountName)` - Find program-owned accounts
- `getRpcHttp()` - Get the RPC HTTP client
- `getRecentBlockHash()` - Get a recent block hash (cached)

## Utility Functions

The library also exports many utility functions for working with Solana data types:

- **Pubkey**: `pubkeyFromBase58`, `pubkeyToBase58`, `pubkeyFromBytes`, `pubkeyToBytes`
- **Base58**: `base58Encode`, `base58Decode`
- **Base64**: `base64Encode`, `base64Decode`
- **Signer**: `signerGenerate`, `signerFromSecret`
- **Transaction**: `transactionCompileAndSign`, `transactionSign`
- **Lamports**: `approximateLamportsForSols`, `approximateSolsForLamports`, `lamportsFeePerSignature`

## Examples

For more detailed examples, check the `snippets/` directory in the repository:

- `snippets/01-connection.ts` - Basic connection setup
- `snippets/02-account-operations.ts` - Fetching and decoding accounts
- `snippets/03-transactions.ts` - Building and sending transactions
- `snippets/04-program-queries.ts` - Querying program-owned accounts
- `snippets/05-pda-operations.ts` - Working with PDAs

## Testing

```bash
npm test
```

## Building

```bash
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

See LICENSE file for details.

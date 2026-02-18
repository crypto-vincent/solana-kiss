# Solana-KISS Code Snippets

This directory contains practical code snippets demonstrating various features and use cases of the solana-kiss library.

## Available Snippets

### 01-connection.ts
Basic connection setup examples showing different ways to connect to Solana networks.

**Topics covered:**
- Connecting with network monikers (devnet, mainnet, testnet)
- Connecting with custom RPC URLs
- Custom RPC configuration
- Connection options
- Getting RPC client
- Getting recent blockhash

### 02-account-operations.ts
Examples for fetching, decoding, and working with Solana accounts.

**Topics covered:**
- Fetching and decoding accounts
- Fetching multiple accounts
- Checking account balances
- Verifying account ownership
- Inspecting account structure

### 03-transactions.ts
Building, signing, sending, and simulating transactions.

**Topics covered:**
- Building instructions
- Sending simple transactions
- Batch transactions (multiple instructions)
- Transactions with extra signers
- Transaction simulation
- Waiting for confirmation
- Decoding instructions

### 04-idl-operations.ts
Working with program IDLs (Interface Definition Language).

**Topics covered:**
- Loading program IDLs
- Listing instructions and accounts
- Getting instruction details
- Listing program PDAs
- Listing program errors
- Preloading custom IDLs
- Custom IDL loaders
- Exploring program structure

### 05-pda-operations.ts
Finding and working with PDAs (Program Derived Addresses).

**Topics covered:**
- Finding PDAs using IDL
- Finding PDAs manually
- User-specific PDAs
- Complex PDAs with multiple seeds
- Checking if PDAs exist
- Finding multiple user PDAs
- Creating PDA initialization instructions
- Hydrating instruction addresses with PDAs

### 06-program-queries.ts
Querying program-owned accounts and batch operations.

**Topics covered:**
- Finding all program-owned accounts
- Fetching and decoding all accounts
- Filtering accounts
- Account statistics
- Sampling accounts
- Finding accounts by owner
- Batch processing
- Comparing account states

### 07-utilities.ts
Various utility functions for working with Solana data types.

**Topics covered:**
- Pubkey utilities (creation, conversion)
- Signer utilities (generation, signing)
- Base encoding (base58, base64, base16)
- Lamports conversion and calculations
- UTF-8 encoding/decoding
- Signature handling
- JSON utilities

## How to Use

Each snippet is a standalone TypeScript file with multiple example functions. To use them:

### Option 1: Copy and Adapt
Copy the relevant example function into your project and modify it for your use case.

### Option 2: Run Directly
Uncomment the `main()` call at the bottom of any snippet file and run it:

```bash
# Using ts-node
npx ts-node snippets/01-connection.ts

# Or compile and run
npx tsc snippets/01-connection.ts
node snippets/01-connection.js
```

### Option 3: Import and Use
Import specific example functions into your own code:

```typescript
import { pubkeyExamples, lamportsExamples } from './snippets/07-utilities';

async function myFunction() {
  pubkeyExamples();
  lamportsExamples();
}
```

## Prerequisites

Most snippets require:
- A connection to a Solana network (devnet examples are most common)
- Some snippets require a funded wallet for sending transactions
- Specific program addresses for program-specific operations

### Getting Test SOL

For running transaction examples on devnet:
1. Generate a new keypair or use an existing one
2. Get devnet SOL from: https://faucet.solana.com/
3. Use the secret key in the examples

## Common Patterns

### Error Handling
All snippets include basic error handling. In production, you should enhance this with:
- Retry logic for network failures
- Better error messages
- Logging
- Metrics

### Async/Await
All blockchain operations are asynchronous. Make sure to use `await` or `.then()` properly.

### Type Safety
All examples are fully typed. Use TypeScript's type checking to catch errors early.

## Additional Resources

- [Main README](../README.md) - Overview and installation
- [API Reference](../README.md#api-reference) - Detailed API documentation
- [Tests](../tests/) - More examples in test files

## Contributing

Found an issue or want to add more examples? Contributions are welcome! Please ensure:
1. Examples are clear and well-commented
2. Code follows the existing style
3. Examples are tested and working

## License

These snippets are part of the solana-kiss library and follow the same license.

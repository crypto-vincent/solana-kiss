# Overview

## Getting Started

The primary way to use `solana-kiss` is through the `Solana` class, which provides a high-level interface for common Solana operations.

```typescript
import { Solana } from "solana-kiss";

const solana = new Solana("devnet");
```

The `Solana` class handles:
- RPC communication with Solana nodes
- IDL loading and caching
- Account fetching and decoding
- Transaction building and signing
- PDA derivation

## Architecture

The library is organized into three main modules:

### `/data` - Core Data Types and Utilities

Low-level primitives for working with Solana data structures:
- Public keys, signatures, and addresses
- Base encoding/decoding (base58, base64, base16)
- Transaction construction
- Cryptographic operations (SHA256)
- JSON utilities

### `/rpc` - RPC Client

Direct RPC communication functions:
- Account queries
- Transaction submission
- Block information
- Transaction history

### `/idl` - Interface Definition Language

Program interface handling:
- IDL parsing and loading
- Account structure decoding
- Instruction encoding/decoding
- Type system conversion

## Usage Patterns

### High-Level (Recommended)

Use the `Solana` class for most operations:

```typescript
const solana = new Solana("mainnet");
const account = await solana.getAndInferAndDecodeAccount(address);
```

### Low-Level

For direct control, use module functions:

```typescript
import { rpcHttpGetAccountWithData, rpcHttpFromUrl } from "solana-kiss";

const rpc = rpcHttpFromUrl("https://api.mainnet-beta.solana.com");
const { accountData } = await rpcHttpGetAccountWithData(rpc, address);
```

## Next Steps

- [Solana.md](Solana.md) - Complete `Solana` class API reference
- [Data.md](Data.md) - Low-level data utilities
- [Rpc.md](Rpc.md) - RPC client functions
- [Idl.md](Idl.md) - IDL handling

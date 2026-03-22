---
title: Getting Started
---

# Getting Started

**solana-kiss** is a zero-dependency, full-featured TypeScript library for
interacting with the Solana blockchain. It ships with:

- A high-level `Solana` class that wires everything together.
- A pure-TypeScript RPC layer with timeouts, retries, and rate-limiting.
- A complete IDL parser and binary codec for Anchor programs.
- Ergonomic helpers for public keys, transactions, signers, and wallet
  adapters.

## Installation

```bash
npm install solana-kiss
```

## Minimal example

```ts
import { Solana } from "solana-kiss";

const solana = new Solana("mainnet");

const { accountState } = await solana.getAndInferAndDecodeAccount(
  pubkeyFromBase58("So11111111111111111111111111111111111111112"),
);

console.log(accountState);
```

## Picking a cluster

Pass a short moniker or a full URL:

```ts
// Monikers – point to the public endpoints
const mainnet = new Solana("mainnet");
const devnet  = new Solana("devnet");
const testnet = new Solana("testnet");

// Custom node / local validator
const local = new Solana("http://localhost:8899");

// Bring your own RpcHttp instance (see the RPC Client guide)
import { rpcHttpFromUrl, rpcHttpWithRetryOnError } from "solana-kiss";

const rpc = rpcHttpWithRetryOnError(
  rpcHttpFromUrl(new URL("https://my-rpc.example.com")),
  async ({ retriedCounter }) => retriedCounter < 3,
);
const solana = new Solana(rpc);
```

## What's next?

| Topic | Description |
|---|---|
| [The Solana Class](./solana-class) | All methods on the top-level entry point |
| [Public Keys](./pubkey) | Parsing, deriving, and verifying `Pubkey` values |
| [Transactions](./transactions) | Compiling, signing, and sending transactions |
| [Instructions](./instructions) | Building and decoding on-chain instructions |
| [Signers & Wallets](./signers-wallets) | `Signer` and browser wallet adapters |
| [RPC Client](./rpc-client) | Low-level JSON-RPC layer and middleware |
| [IDL Programs](./idl-programs) | Loading and caching Anchor program IDLs |
| [IDL Types](./idl-types) | Binary encoding/decoding with the type system |
| [Execution & Blocks](./execution-blocks) | Transaction results and log parsing |
| [SPL & Utilities](./spl-utilities) | Well-known program addresses and fee helpers |
| [Data Encoding](./data-encoding) | Base58, Base64, Base16, UTF-8, SHA-256 |

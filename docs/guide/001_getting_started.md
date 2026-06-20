---
title: Getting Started
---

# Getting Started

**solana-kiss** is a zero-dependency, full-featured TypeScript library for
interacting with the Solana blockchain. It ships with:

- A high-level `Solana` class that wires everything together.
- A pure-TypeScript RPC layer with timeouts, retries, and rate-limiting.
- A complete IDL parser and binary codec for Anchor programs.
- Ergonomic helpers for public keys, transactions, signers, and wallet adapters.

## Installation

```bash
npm install solana-kiss
```

## Minimal example

```ts
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("mainnet");

const { accountState } = await solana.getAndInferAndDecodeAccount(
  pubkeyFromBase58("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
);

console.log(accountState);
```

## Which API should I use?

Start with the `Solana` class for application code. It wires together RPC, IDL
loading, decoding, simulation, signing, sending, and confirmation.

Use the lower-level RPC helpers when you need custom request pipelines,
middleware ordering, or transaction polling behavior. Use the IDL, codec, and
encoding helpers directly when building libraries, explorers, indexers, or test
tools.

## Common failures

| Error case                   | What to check                                             |
| ---------------------------- | --------------------------------------------------------- |
| Account cannot be decoded    | The owning program may not expose an IDL for that account |
| Instruction cannot be built  | Required IDL account addresses may be missing             |
| RPC returns HTTP `429`       | Add retry/rate-limit middleware or use a private RPC URL  |
| Wallet signing is rejected   | Treat it as user cancellation and keep the unsigned state |
| Transaction is not confirmed | Recent block hashes expire after roughly 90 seconds       |

## What's next?

| Topic                                        | Description                                      |
| -------------------------------------------- | ------------------------------------------------ |
| [The Solana Class](./002_solana_class)       | All methods on the top-level entry point         |
| [Public Keys](./003_pubkey)                  | Parsing, deriving, and verifying `Pubkey` values |
| [Transactions](./004_transactions)           | Compiling, signing, and sending transactions     |
| [Instructions](./005_instructions)           | Building and decoding on-chain instructions      |
| [Signers & Wallets](./006_signers_wallets)   | `Signer` and browser wallet adapters             |
| [RPC Client](./007_rpc_client)               | Low-level JSON-RPC layer and middleware          |
| [IDL Programs](./008_idl_programs)           | Loading and caching Anchor program IDLs          |
| [IDL Types](./009_idl_types)                 | Binary encoding/decoding with the type system    |
| [Execution & Blocks](./010_execution_blocks) | Transaction results and log parsing              |
| [SPL & Utilities](./011_spl_utilities)       | Well-known program addresses and fee helpers     |
| [Data Encoding](./012_data_encoding)         | Base58, Base64, Base16, UTF-8, SHA-256           |

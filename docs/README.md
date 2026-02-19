# solana-kiss

> A minimal, elegant TypeScript library for Solana —
> transactions, IDL parsing, wallets, and more.

[![npm](https://img.shields.io/npm/v/solana-kiss)](https://www.npmjs.com/package/solana-kiss)
[![GitHub](https://img.shields.io/badge/source-GitHub-181717?logo=github)](https://github.com/crypto-vincent/solana-kiss)

---

## Features

- ⚡ **Zero runtime dependencies** — fully tree-shakeable
- 🔑 **Full IDL support** — parse, encode and decode Anchor and native program IDLs
- 💼 **Wallet Standard** — first-class support for the Wallet Standard interface
- 📦 **TypeScript-first** — full type safety throughout

## Installation

```bash
npm install solana-kiss
```

## Quick start

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana({ rpc: "https://api.mainnet-beta.solana.com" });

const address = pubkeyFromBase58("So11111111111111111111111111111111111111112");
const account = await solana.getAndInferAndDecodeAccount(address);
console.log(account);
```

## API Reference

Browse the full API in the sidebar →

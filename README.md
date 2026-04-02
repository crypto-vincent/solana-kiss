# solana-kiss

TypeScript Solana toolkit with a high-level client, low-level RPC utilities,
transaction builders, and IDL-based decoding.

- No runtime Solana dependency, no supply-chain attacks
- Strict typed helpers for keys, signers, transactions, and codecs
- Built-in IDL loading, account decoding, instruction decoding, and PDA helpers
- Works as both a simple entry point and a lower-level toolbox

## Install

```sh
npm install solana-kiss
```

## Example

```ts
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("mainnet");

const { accountState } = await solana.getAndInferAndDecodeAccount(
  pubkeyFromBase58("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
);

console.log(accountState);
```

## What You Get

- `Solana` class for RPC, IDL loading, decoding, simulation, and execution
- Pure TypeScript JSON-RPC client with timeout, retry, concurrency, and
  rate-limit helpers
- Transaction compile/sign/decompile utilities
- Anchor/native IDL parsing and binary codecs
- SPL, encoding, hashing, and explorer/url helpers

## Docs

[Guide and examples](https://crypto-vincent.github.io/solana-kiss/)

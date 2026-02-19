# solana-kiss

Zero-dependency, lightweight Solana framework for TypeScript.

## Install

```bash
npm install solana-kiss
```

## Examples

### Connect and fetch an account

```typescript
import { Solana, pubkeyFromBase58 } from "solana-kiss";

const solana = new Solana("devnet");
const account = await solana.getAndInferAndDecodeAccount(
  pubkeyFromBase58("YourAccountAddress")
);
console.log(account.accountState);
```

### Send a transaction

```typescript
import { Solana, signerFromSecret } from "solana-kiss";

const solana = new Solana("mainnet");
const signer = await signerFromSecret(yourSecretKey);

const { transactionHandle } = await solana.prepareAndSendTransaction(
  signer,
  [instructionRequest]
);
```

### Low-level utilities

```typescript
import { pubkeyFindPdaAddress, base58Encode, sha256Hash } from "solana-kiss";

const pda = pubkeyFindPdaAddress(programId, [seed1, seed2]);
const encoded = base58Encode(data);
const hash = sha256Hash(message);
```

## Documentation

See [/docs](/docs) for detailed documentation:

- [Overview](/docs/Overview.md) - Getting started with the `Solana` class
- [Solana](/docs/Solana.md) - High-level wrapper API
- [Data](/docs/Data.md) - Low-level data utilities (`/data` module)
- [Rpc](/docs/Rpc.md) - RPC client functions (`/rpc` module)
- [Idl](/docs/Idl.md) - IDL handling (`/idl` module)

## Philosophy

No bloat, no dependencies, full functionality. This library provides complete Solana blockchain interaction capabilities without supply-chain vulnerabilities or excessive footprint.

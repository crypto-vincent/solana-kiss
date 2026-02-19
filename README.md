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

1. [Overview](/docs/1-Overview.md) - Getting started
2. [Solana](/docs/2-Solana.md) - High-level API (start here)
3. [Data](/docs/3-Data.md) - Low-level utilities
4. [Rpc](/docs/4-Rpc.md) - Direct RPC calls
5. [Idl](/docs/5-Idl.md) - IDL handling

## Philosophy

**Keep it simple, stupid.** No bloat, no dependencies, full functionality. This library provides complete Solana blockchain interaction without supply-chain vulnerabilities or excessive footprint.

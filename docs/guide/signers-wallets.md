---
title: Signers & Wallets
---

# Signers & Wallets

solana-kiss distinguishes between two signing interfaces:

| Interface | Use case |
|---|---|
| `Signer` | Server-side / Node.js, holds the private key in the Web Crypto store |
| `WalletAccount` | Browser, delegates signing to a wallet extension |

Both are accepted wherever signatures are needed (e.g.
`transactionCompileAndSign`).

## `Signer`

```ts
type Signer = {
  address: Pubkey;
  sign: (message: TransactionMessage | Uint8Array) => Promise<Signature>;
};
```

### Generate a fresh keypair

```ts
import { signerGenerate } from "solana-kiss";

const signer = await signerGenerate();
// The private key is non-extractable – held in the Web Crypto key store only.
console.log(signer.address); // the derived public key
```

### Load from a 64-byte secret

The secret follows the standard Solana format: the first 32 bytes are the
private seed and the last 32 bytes are the public key.

```ts
import { signerFromSecret } from "solana-kiss";

const signer = await signerFromSecret(secretBytes);
// By default the keypair consistency is verified before returning.
```

To skip verification (useful for hot paths):

```ts
const signer = await signerFromSecret(secretBytes, { skipVerification: true });
```

## Browser wallet adapters (`WalletProvider` / `WalletAccount`)

### Discovering wallets

```ts
import { walletProviders } from "solana-kiss";

const unsubscribe = walletProviders.subscribe((providers) => {
  for (const p of providers) {
    console.log(p.name, p.icon);
  }
});
```

`walletProviders` is a lazy `RxObservable` – discovery starts on the first
`subscribe()` call by dispatching the `wallet-standard:app-ready` event to
discover all installed extensions.

### Connecting to a wallet

```ts
const providers = walletProviders.get?.() ?? [];
const phantom = providers.find((p) => p.name === "Phantom");

if (phantom) {
  const accounts = await phantom.connect();
  // accounts: Array<WalletAccount>
  const account = accounts[0]!;
  console.log(account.address);
}
```

To reconnect silently (no approval dialog):

```ts
const accounts = await phantom.connect({ silent: true });
```

### Disconnecting

```ts
await phantom.disconnect();
```

### Using a `WalletAccount` to sign

`WalletAccount` has two methods:

```ts
type WalletAccount = {
  address: Pubkey;
  signMessage: (message: Uint8Array) => Promise<Signature>;
  signTransaction: (packet: TransactionPacket) => Promise<TransactionPacket>;
};
```

Pass a `WalletAccount` directly to `transactionCompileAndSign`:

```ts
import { transactionCompileAndSign } from "solana-kiss";

const packet = await transactionCompileAndSign([walletAccount], request);
```

### Reactive account list

```ts
const unsubscribe = phantom.accounts.subscribe((accounts) => {
  // called immediately with the current list and on every change
  currentAccounts = accounts;
});

// Later:
unsubscribe();
```

## `TransactionProcessor`

For advanced scenarios (e.g. multi-sig wallets, Ledger hardware) you can pass
a raw async function as a signer. It receives the current
`TransactionPacket` and must return the updated packet:

```ts
import type { TransactionProcessor } from "solana-kiss";

const ledgerProcessor: TransactionProcessor = async (packet) => {
  // Call your Ledger SDK here…
  return signedPacket;
};

const packet = await transactionCompileAndSign([ledgerProcessor], request);
```

## Choosing the right interface

```
Node.js / scripts  →  signerFromSecret / signerGenerate
Browser (dApp)     →  walletProviders + WalletAccount
Custom hardware    →  TransactionProcessor callback
```

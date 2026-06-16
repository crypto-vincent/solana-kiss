---
title: Signers & Wallets
---

# Signers & Wallets

| Interface       | Use case                                             |
| --------------- | ---------------------------------------------------- |
| `Signer`        | Node.js / server — private key lives in Web Crypto   |
| `WalletAccount` | Browser — signing is delegated to a wallet extension |

Both work wherever signatures are needed (e.g. `transactionCompileAndSign`).

## `Signer` — Node.js

```ts
import { signerGenerate, signerFromSecret } from "solana-kiss";

// Generate a fresh keypair (non-extractable private key)
const signer = await signerGenerate();

// Load from a 64-byte secret (first 32 = seed, last 32 = public key)
const signer = await signerFromSecret(secretBytes);

console.log(signer.address); // Pubkey
```

## Browser wallets (`WalletAccount`)

### Discover installed wallets

```ts
import { walletProviders } from "solana-kiss";

walletProviders.subscribe(function (providers) {
  for (const provider of providers) {
    console.log(provider.name, provider.icon);
  }
});
```

### Connect and sign

```ts
const providers = walletProviders.get?.() ?? [];
const phantom = providers.find(function (provider) {
  return provider.name === "Phantom";
});

if (phantom) {
  const [account] = await phantom.connect();

  // Pass the account directly to transactionCompileAndSign
  const packet = await transactionCompileAndSign([account], request);
}

// Reconnect silently (no approval dialog)
await phantom.connect({ silent: true });

// Disconnect
await phantom.disconnect();
```

### Reactive account list

```ts
const unsubscribe = phantom.accounts.subscribe(function (accounts) {
  console.log("phantom accounts", accounts); // called immediately and on change
});
unsubscribe(); // stop listening
```

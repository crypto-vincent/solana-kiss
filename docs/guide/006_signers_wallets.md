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

### Discover installed wallet extensions

To use the user's wallets, subscribe to the available wallet providers

```ts
import { walletProviders } from "solana-kiss";

walletProviders.subscribe(function (providers) {
  // This will trigger when a wallet extension is detected
  for (const provider of providers) {
    // provider is a WalletProvider
  }
});
```

### Connect

Once the wallet provider is selected, you can subscribe to its wallet accounts

```ts
import { WalletProvider } from "solana-kiss";

const provider: WalletProvider; // Previously discovered
provider.accounts.subscribe(function (accounts) {
  // This will trigger when the user have unlocked the wallet
  for (const account of accounts) {
    // account is a WalletAccount
  }
});
```

Ask the user to unlock and connect the wallet, this will populate the `accounts`

```ts
import { WalletProvider } from "solana-kiss";

const provider: WalletProvider; // Previously discovered
await provider.connect(); // This will open the wallet extension and ask for unlock
```

### Sign

Discovered wallet accounts can then be used as signers

```ts
import { WalletAccount } from "solana-kiss";

const account: WalletAccount; // Previously discovered
const transactionPacket = await transactionCompileAndSign(
  [account],
  transactionRequest,
);
```

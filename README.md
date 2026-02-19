# Solana - Keep It Simple, Stupid

A full-featured Solana framework with zero dependencies. No supply chain risk — the whole thing ships as one self-contained package with no transitive exposure.

The framework is split into four modules:

- **Solana** — the high-level entry point. One class that covers the full lifecycle: load program IDLs (on-chain or remote), decode account state, build instructions from human-readable inputs, sign and submit transactions, derive PDAs, and connect browser wallets.
- **RPC** — typed wrappers for every Solana JSON-RPC method, with built-in retry, concurrency limiting, and convenience helpers like `findBlocks` or `findAccountTransactions`.
- **IDL** — everything around Anchor and native IDLs: parsing, hydrating, encoding instruction arguments, decoding account layouts, and resolving PDAs.
- **data** — the primitives everything else is built on: public keys, signers, transactions, signatures, base58/64, SHA-256, and more.

```bash
npm install solana-kiss
```

---

**Read an account**

```ts
const solana = new Solana("mainnet-beta");
const { accountState } = await solana.getAndInferAndDecodeAccount(address);
```

**Discover and connect a browser wallet**

```ts
import { walletProviders } from "solana-kiss";

// auto-discovers injected extensions (Phantom, Backpack, …)
walletProviders.subscribe(async (providers) => {
  if (!providers.length) return;
  const [walletAccount] = await providers[0].connect();
  // walletAccount.address, walletAccount.signTransaction, …
});
```

**Build and send a transaction**

```ts
const { instructionRequest } = await solana.hydrateAndEncodeInstruction(
  programAddress,
  "transfer",
  { instructionAddresses: { from, to }, instructionPayload: { amount: "1000" } },
);
const { transactionHandle } = await solana.prepareAndSendTransaction(signer, [instructionRequest]);
```

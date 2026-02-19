# Solana - Keep It Simple, Stupid

No bloat, zero dependencies, full-featured Solana framework — eliminating supply chain risk and keeping the attack surface as small as possible.

```bash
npm install solana-kiss
```

- **Solana** — high-level class: decode accounts, build & send transactions, load IDLs, derive PDAs, detect browser wallets.
- **RPC** — thin typed wrappers around every Solana JSON-RPC method.
- **IDL** — everything related to encoding/decoding instruction data and account layouts (Anchor & native).
- **data** — primitive building blocks: keys, signers, transactions, base58/64, hashing, and more.

---

**Read an account**

```ts
const solana = new Solana("mainnet-beta");
const { accountState } = await solana.getAndInferAndDecodeAccount(address);
```

**Connect a browser wallet and send a transaction**

```ts
import { walletProviders, Solana } from "solana-kiss";

// discover injected wallets (Phantom, Backpack, …)
walletProviders.subscribe(async (providers) => {
  if (!providers.length) return;
  const [walletAccount] = await providers[0].connect();

  const solana = new Solana("mainnet-beta");
  const { transactionHandle } = await solana.prepareAndSendTransaction(
    walletAccount,
    [instructionRequest],
  );
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

# Solana - Keep It Simple, Stupid

No bloat, zero dependencies, full-featured Solana framework — eliminating supply chain risk and keeping the attack surface as small as possible.

```bash
npm install solana-kiss
```

---

## What's inside

- **`Solana` class** — high-level entry point for 95% of use cases: load IDLs, decode accounts, build/send/simulate transactions, derive PDAs, find program-owned accounts.
- **Lower-level utilities** — all the building blocks (`rpcHttp*`, `idl*`, `transaction*`, …) are exported individually for special cases where you need finer control.
- **Browser wallet detection** — built-in [Wallet Standard](https://github.com/wallet-standard/wallet-standard) support; discovers injected wallets (Phantom, Backpack, …) automatically with no extra adapter library.

---

**Read an account**

```ts
const solana = new Solana("mainnet-beta");
const { accountState } = await solana.getAndInferAndDecodeAccount(address);
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

**Detect browser wallets**

```ts
import { walletProviders } from "solana-kiss";

walletProviders.subscribe((providers) => {
  // called whenever a new wallet extension is discovered
  for (const provider of providers) {
    console.log(provider.name, provider.icon);
  }
});
```

**Lower-level escape hatch**

```ts
import { rpcHttpGetAccountWithData, rpcHttpFromUrl } from "solana-kiss";

const rpc = rpcHttpFromUrl("https://my-custom-rpc.example.com");
const { accountData } = await rpcHttpGetAccountWithData(rpc, address);
```

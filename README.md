# Solana - Keep It Simple, Stupid

No bloat, no dependency, full-featured solana framework.

```bash
npm install solana-kiss
```

---

**Read an account**

```ts
const solana = new Solana("mainnet-beta");
const { accountState } = await solana.getAndInferAndDecodeAccount(address);
```

**Load a program IDL**

```ts
const { programIdl } = await solana.getOrLoadProgramIdl(programAddress);
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

**Find all accounts owned by a program**

```ts
const accounts = await solana.findProgramOwnedAccounts(programAddress, "UserAccount");
```

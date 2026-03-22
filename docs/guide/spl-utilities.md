---
title: SPL & Utilities
---

# SPL & Utilities

## Well-known program addresses

All addresses are exported as typed `Pubkey` constants:

```ts
import {
  splSystemProgramAddress,
  splAddressLookupProgramAddress,
  splComputeBudgetProgramAddress,
  splTokenProgramAddress,
  splAssociatedTokenProgramAddress,
  splNameServiceProgramAddress,
} from "solana-kiss";
```

| Constant | Address |
|---|---|
| `splSystemProgramAddress` | `11111111111111111111111111111111` |
| `splAddressLookupProgramAddress` | `AddressLookupTab1e1111111111111111111111111` |
| `splComputeBudgetProgramAddress` | `ComputeBudget111111111111111111111111111111` |
| `splTokenProgramAddress` | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` |
| `splAssociatedTokenProgramAddress` | `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL` |
| `splNameServiceProgramAddress` | `namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX` |

## Lamports & fees

### SOL ↔ lamports conversion

```ts
import {
  approximateSolsForLamports,
  approximateLamportsForSols,
} from "solana-kiss";

const sols    = approximateSolsForLamports(1_000_000_000n); // → 1.0
const lamports = approximateLamportsForSols(0.5);           // → 500_000_000n
```

::: warning
These are approximate conversions. Avoid using them for fee calculations that
require exact precision.
:::

### Rent-exemption minimum

```ts
import { lamportsRentExemptionMinimumForSpace } from "solana-kiss";

// Minimum balance to keep an account open (rent-exempt)
const minimum = lamportsRentExemptionMinimumForSpace(165); // for a token account
```

Uses the formula: `(128 + space) × 3480 lamports/byte/year × 2`.

### Fee constants

```ts
import { lamportsFeePerBytePerYear, lamportsFeePerSignature } from "solana-kiss";

// 3480n  – rent fee per byte per year
console.log(lamportsFeePerBytePerYear);

// 5000n  – fee per signature
console.log(lamportsFeePerSignature);
```

## Explorer URLs

Generate links to the [Solana Explorer](https://explorer.solana.com) for any
cluster, including custom local validators.

```ts
import {
  urlExplorerAccount,
  urlExplorerBlock,
  urlExplorerTransaction,
  urlExplorerSimulation,
  urlRpcFromUrlOrMoniker,
} from "solana-kiss";

const rpcUrl = urlRpcFromUrlOrMoniker("mainnet");

// Account / address page
const accountUrl = urlExplorerAccount(rpcUrl, accountAddress);

// Block page
const blockUrl = urlExplorerBlock(rpcUrl, blockSlot);

// Confirmed transaction page
const txUrl = urlExplorerTransaction(rpcUrl, transactionHandle);

// Pre-load an unsigned/signed transaction in the inspector (no broadcast)
const simUrl = urlExplorerSimulation(rpcUrl, transactionPacket);
```

For a custom RPC the cluster parameter is set to
`customUrl=<encoded-rpc-url>`, which is accepted by the Explorer.

## RPC endpoint URLs

```ts
import {
  urlRpcPublicMainnet,
  urlRpcPublicDevnet,
  urlRpcPublicTestnet,
  urlRpcFromUrlOrMoniker,
} from "solana-kiss";

// Predefined public endpoints
const mainnet = urlRpcPublicMainnet; // https://api.mainnet-beta.solana.com
const devnet  = urlRpcPublicDevnet;  // https://api.devnet.solana.com
const testnet = urlRpcPublicTestnet; // https://api.testnet.solana.com

// Resolve a moniker or pass through an arbitrary URL string
const url = urlRpcFromUrlOrMoniker("devnet");
const url2 = urlRpcFromUrlOrMoniker("https://my-rpc.example.com");
```

## Reactive utilities (`Rx`)

A minimal reactive primitive – used internally by `walletProviders` and
`WalletProvider.accounts`.

```ts
import { rxBehaviourSubject } from "solana-kiss";

const counter = rxBehaviourSubject(0);

const unsubscribe = counter.subscribe((value) => {
  console.log("counter =", value);
});
// → "counter = 0"  (immediate with current value)

counter.notify(1);  // → "counter = 1"
counter.notify(2);  // → "counter = 2"

const current = counter.get(); // → 2

unsubscribe(); // stop listening
```

## Memoize utility

```ts
import { memoize } from "solana-kiss";

const expensiveFn = memoize(
  (input: string) => input,         // cache key extractor
  async (input: string) => {        // actual work
    return await fetchSomething(input);
  },
);

// Second call with the same key returns the cached promise
const [a, b] = await Promise.all([expensiveFn("x"), expensiveFn("x")]);
// fetchSomething was called only once
```

## Error utilities

```ts
import { ErrorStack, withErrorContext } from "solana-kiss";

// withErrorContext wraps a synchronous function and prefixes its errors
try {
  withErrorContext("outer context", () => {
    throw new Error("inner error");
  });
} catch (err) {
  // err.message starts with "outer context:"
}

// ErrorStack aggregates multiple child errors
const stack = new ErrorStack("Could not load IDL", [err1, err2]);
console.log(stack.message);
```

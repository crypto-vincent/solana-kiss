# Overview

**Keep it simple, stupid.** Zero dependencies, full functionality.

## Quick Start

```typescript
import { Solana } from "solana-kiss";

const solana = new Solana("devnet");
const account = await solana.getAndInferAndDecodeAccount(address);
```

That's it. **Simple.**

## Architecture

Four modules:

### 1. `Solana` Class (High-Level)
**Use this.** Handles everything: RPC, IDL, decoding, transactions.

```typescript
const solana = new Solana("mainnet");
```

### 2. `/data` Module (Primitives)
Low-level utilities when you need control:
- Public keys, signatures
- Base encoding (base58, base64, base16)
- Transactions, signers
- Crypto (SHA256)

```typescript
import { pubkeyFindPdaAddress, base58Encode } from "solana-kiss";
```

### 3. `/rpc` Module (Direct RPC)
Direct node communication:
- Account queries
- Transaction submission
- Block information

```typescript
import { rpcHttpFromUrl, rpcHttpGetAccountWithData } from "solana-kiss";
```

### 4. `/idl` Module (Interface Parsing)
Program interface handling:
- IDL loading
- Account decoding
- Instruction encoding

```typescript
import { idlProgramParse, idlAccountDecode } from "solana-kiss";
```

## Usage Patterns

### Simple (Recommended)

```typescript
const solana = new Solana("devnet");
const account = await solana.getAndInferAndDecodeAccount(address);
```

### Advanced (Custom Control)

```typescript
import { rpcHttpFromUrl, rpcHttpGetAccountWithData } from "solana-kiss";

const rpc = rpcHttpFromUrl("https://api.mainnet-beta.solana.com");
const { accountData } = await rpcHttpGetAccountWithData(rpc, address);
```

## Philosophy

- **Zero dependencies**: No supply-chain attacks
- **Low footprint**: Minimal code, maximum function
- **Keep it simple**: Straightforward API, no magic
- **Full featured**: Everything you need, nothing you don't

## Next Steps

1. [Solana Class](2-Solana.md) - Main API (start here)
2. [Data Module](3-Data.md) - Primitives and utilities
3. [RPC Module](4-Rpc.md) - Direct RPC calls
4. [IDL Module](5-Idl.md) - Interface handling

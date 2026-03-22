---
title: Transactions
---

# Transactions

A Solana transaction is compiled from a `TransactionRequest`, signed into a
`TransactionPacket`, and then submitted to the network. The library handles
all wire-format serialisation internally.

## Key types

| Type | Description |
|---|---|
| `TransactionRequest` | Payer address + recent block hash + ordered instructions |
| `TransactionPacket` | Fully serialised, wire-ready bytes (branded `Uint8Array`) |
| `TransactionMessage` | The message portion of a packet (signature slots stripped) |
| `TransactionHandle` | A base58-encoded signature used as the transaction's on-chain ID |
| `TransactionAddressLookupTable` | An address lookup table reference for versioned transactions |

## Building a `TransactionRequest`

```ts
import { TransactionRequest } from "solana-kiss";

const request: TransactionRequest = {
  payerAddress: signerAddress,
  recentBlockHash: blockHash,   // BlockHash – see Execution & Blocks guide
  instructionsRequests: [ix1, ix2],
};
```

## Compiling and signing in one step

```ts
import { transactionCompileAndSign } from "solana-kiss";

const packet = await transactionCompileAndSign(
  [signer],          // Array<Signer | WalletAccount | TransactionProcessor>
  request,
  addressLookupTables, // optional
);
```

## Compile without signing (offline / partial signing)

```ts
import { transactionCompileUnsigned } from "solana-kiss";

const unsignedPacket = transactionCompileUnsigned(request);
```

Throws if the resulting packet exceeds the 1232-byte limit.

## Signing an already-compiled packet

```ts
import { transactionSign } from "solana-kiss";

const signedPacket = await transactionSign(unsignedPacket, [signer]);
```

Accepts `Signer`, `WalletAccount`, or a raw `TransactionProcessor` function.

## Verifying signatures

```ts
import { transactionVerify } from "solana-kiss";

await transactionVerify(signedPacket); // throws if any signature is invalid
```

## Extracting parts from a packet

```ts
import {
  transactionExtractMessage,
  transactionExtractSigning,
} from "solana-kiss";

const message = transactionExtractMessage(packet);
// → TransactionMessage (bytes after the signature slots)

const signing = transactionExtractSigning(packet);
// → Array<{ signerAddress: Pubkey, signature: Signature }>
```

## Working with `TransactionHandle`

A `TransactionHandle` is the base58 string of the first signer's 64-byte
signature – it uniquely identifies a transaction on-chain.

```ts
import {
  transactionHandleFromBase58,
  transactionHandleToBase58,
} from "solana-kiss";

const handle = transactionHandleFromBase58("5xHe...");
const str = transactionHandleToBase58(handle);
```

## Address lookup tables (versioned transactions)

Pass one or more `TransactionAddressLookupTable` values to
`transactionCompileAndSign` to compress large account lists using on-chain ALTs:

```ts
const alts: TransactionAddressLookupTable[] = [
  {
    tableAddress: altAddress,
    lookupAddresses: [addr1, addr2, addr3],
  },
];

const packet = await transactionCompileAndSign([signer], request, alts);
```

The compiler automatically promotes eligible non-signer accounts into lookup
table references.

## Parsing raw packet bytes

```ts
import { transactionPacketFromBytes, transactionPacketToBytes } from "solana-kiss";

const packet = transactionPacketFromBytes(rawBytes);
const bytes  = transactionPacketToBytes(packet);
```

`transactionPacketFromBytes` validates the packet structure before returning.

## Full example: compile, sign, send, confirm

```ts
import {
  Solana,
  signerFromSecret,
  pubkeyFromBase58,
  transactionCompileAndSign,
} from "solana-kiss";

const solana  = new Solana("devnet");
const signer  = await signerFromSecret(mySecretBytes);
const rpc     = solana.getRpcHttp();

// 1. Fetch a recent block hash
const { blockHash } = await rpcHttpGetLatestBlockHash(rpc);

// 2. Build the request
const request: TransactionRequest = {
  payerAddress: signer.address,
  recentBlockHash: blockHash,
  instructionsRequests: [myInstruction],
};

// 3. Compile + sign
const packet = await transactionCompileAndSign([signer], request);

// 4. Send
const { transactionHandle } = await rpcHttpSendTransaction(rpc, packet);
console.log("Sent:", transactionHandle);
```

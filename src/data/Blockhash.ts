import { base58Decode, base58Encode } from "./Base58";

export type Blockhash =
  | (string & { readonly __brand: unique symbol })
  | { readonly __brand: unique symbol };

export function blockhashFromBase58(base58: string): Blockhash {
  const bytes = base58Decode(base58);
  blockhashBytesCheck(bytes);
  return base58 as Blockhash;
}

export function blockhashFromBytes(bytes: Uint8Array): Blockhash {
  blockhashBytesCheck(bytes);
  const blockhash = base58Encode(bytes);
  return blockhash as Blockhash;
}

export function blockhashToBytes(value: Blockhash): Uint8Array {
  const bytes = base58Decode(value as string);
  blockhashBytesCheck(bytes);
  return bytes;
}

export function blockhashToBase58(value: Blockhash): string {
  return value as string;
}

function blockhashBytesCheck(bytes: Uint8Array) {
  if (bytes.length !== 32) {
    throw new Error(
      `Blockhash: Expected blockhash spanning 32 bytes (found: ${bytes.length})`,
    );
  }
}

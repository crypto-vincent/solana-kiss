import { base58Decode, base58Encode } from "./Base58";

export type Blockhash =
  | (string & { readonly __brand: unique symbol })
  | { readonly __brand: unique symbol };

export function blockhashFromString(string: string): Blockhash {
  const bytes = base58Decode(string);
  blockhashBytesCheck(bytes);
  return string as Blockhash;
}

export function blockhashFromBytes(bytes: Uint8Array): Blockhash {
  blockhashBytesCheck(bytes);
  const blockhash = base58Encode(bytes);
  return blockhash as Blockhash;
}

export function blockhashToBytes(blockhash: Blockhash): Uint8Array {
  const bytes = base58Decode(blockhash as string);
  blockhashBytesCheck(bytes);
  return bytes;
}

export function blockhashToString(blockhash: Blockhash): string {
  return blockhash as string;
}

function blockhashBytesCheck(bytes: Uint8Array) {
  if (bytes.length !== 32) {
    throw new Error(
      `Blockhash: Expected blockhash spanning 32 bytes (found: ${bytes.length})`,
    );
  }
}

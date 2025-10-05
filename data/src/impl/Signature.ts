import { base58Decode, base58Encode } from "./Base58";

export type Signature =
  | (string & { readonly __brand: unique symbol })
  | { readonly __brand: unique symbol };

export function signatureFromString(string: string): Signature {
  const bytes = base58Decode(string);
  signatureBytesCheck(bytes);
  return string as Signature;
}

export function signatureFromBytes(bytes: Uint8Array): Signature {
  signatureBytesCheck(bytes);
  const signature = base58Encode(bytes);
  return signature as Signature;
}

export function signatureToBytes(signature: Signature): Uint8Array {
  const bytes = base58Decode(signature as string);
  signatureBytesCheck(bytes);
  return bytes;
}

export function signatureToString(signature: Signature): string {
  return signature as string;
}

function signatureBytesCheck(bytes: Uint8Array) {
  if (bytes.length !== 64) {
    throw new Error(
      `Signature: Expected signature spanning 64 bytes (found: ${bytes.length})`,
    );
  }
}

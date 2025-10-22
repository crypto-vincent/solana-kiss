import { base58Decode, base58Encode } from "./Base58";
import { BrandedType } from "./Utils";

export type Signature = BrandedType<string, "Signature">;

export function signatureFromBase58(base58: string): Signature {
  const bytes = base58Decode(base58);
  signatureBytesCheck(bytes);
  return base58 as Signature;
}

export function signatureFromBytes(bytes: Uint8Array): Signature {
  signatureBytesCheck(bytes);
  const signature = base58Encode(bytes);
  return signature as Signature;
}

export function signatureToBytes(value: Signature): Uint8Array {
  const bytes = base58Decode(value as string);
  signatureBytesCheck(bytes);
  return bytes;
}

export function signatureToBase58(value: Signature): string {
  return value as string;
}

function signatureBytesCheck(bytes: Uint8Array) {
  if (bytes.length !== 64) {
    throw new Error(
      `Signature: Expected signature spanning 64 bytes (found: ${bytes.length})`,
    );
  }
}

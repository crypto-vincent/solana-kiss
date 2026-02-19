import { base58Decode, base58Encode } from "./Base58";
import { Branded } from "./Utils";

/** A branded string representing a Solana transaction signature (64-byte Base58-encoded value). */
export type Signature = Branded<string, "Signature">;

/**
 * Creates a {@link Signature} from a Base58-encoded string.
 * @param base58 - A 64-byte signature encoded as Base58.
 * @returns The typed {@link Signature}.
 * @throws {Error} If the decoded bytes are not exactly 64 bytes.
 */
export function signatureFromBase58(base58: string): Signature {
  const bytes = base58Decode(base58);
  signatureBytesCheck(bytes);
  return base58 as Signature;
}

/**
 * Creates a {@link Signature} from a raw 64-byte array.
 * @param bytes - Exactly 64 bytes representing the signature.
 * @returns The typed {@link Signature} as a Base58 string.
 * @throws {Error} If `bytes` is not exactly 64 bytes.
 */
export function signatureFromBytes(bytes: Uint8Array): Signature {
  signatureBytesCheck(bytes);
  const signature = base58Encode(bytes);
  return signature as Signature;
}

/**
 * Decodes a {@link Signature} into its raw 64-byte representation.
 * @param value - The signature to decode.
 * @returns A 64-byte `Uint8Array`.
 * @throws {Error} If the decoded bytes are not exactly 64 bytes.
 */
export function signatureToBytes(value: Signature): Uint8Array {
  const bytes = base58Decode(value as string);
  signatureBytesCheck(bytes);
  return bytes;
}

/**
 * Returns the Base58 string representation of a {@link Signature}.
 * @param value - The signature.
 * @returns The Base58-encoded string.
 */
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

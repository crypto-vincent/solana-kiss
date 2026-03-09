import { Branded } from "./Utils";

/** A branded 64-byte array representing a Ed25519 signature. */
export type Signature = Branded<Uint8Array, "Signature">;

/**
 * Creates a {@link Signature} from a raw 64-byte array.
 * @param bytes - Exactly 64 bytes representing the signature.
 * @returns The typed {@link Signature}.
 * @throws {Error} If `bytes` is not exactly 64 bytes.
 */
export function signatureFromBytes(bytes: Uint8Array): Signature {
  if (bytes.length !== 64) {
    throw new Error(`Signature: Expected 64 bytes (found: ${bytes.length})`);
  }
  return bytes as Signature;
}

/**
 * Returns the raw byte array from a {@link Signature}
 * @param signature - The signature to decode.
 * @returns A 64-byte `Uint8Array`.
 */
export function signatureToBytes(signature: Signature): Uint8Array {
  return signature as Uint8Array;
}

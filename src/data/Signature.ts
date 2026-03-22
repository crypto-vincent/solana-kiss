import { Branded } from "./Utils";

/** A branded 64-byte array representing a Ed25519 signature. */
export type Signature = Branded<Uint8Array, "Signature">;

/**
 * Creates a {@link Signature} from 64 bytes.
 * @param bytes - Exactly 64 bytes.
 * @returns Typed {@link Signature}.
 * @throws If not exactly 64 bytes.
 */
export function signatureFromBytes(bytes: Uint8Array): Signature {
  if (bytes.length !== 64) {
    throw new Error(`Signature: Expected 64 bytes (found: ${bytes.length})`);
  }
  return bytes as Signature;
}

/**
 * Returns the raw bytes of a {@link Signature}.
 * @param signature - Signature to decode.
 * @returns 64-byte `Uint8Array`.
 */
export function signatureToBytes(signature: Signature): Uint8Array {
  return signature as Uint8Array;
}

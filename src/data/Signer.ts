import { Pubkey, pubkeyFromBytes, pubkeyToVerifier } from "./Pubkey";
import { Signature, signatureFromBytes } from "./Signature";
import { TransactionMessage } from "./Transaction";

/** Ed25519 signing keypair: address + sign function. */
export type Signer = {
  /** The public key address associated with this signer. */
  address: Pubkey;
  /**
   * Signs a message with the signer's private key.
   * @param message - Raw bytes to sign.
   * @returns 64-byte {@link Signature}.
   */
  sign: (message: TransactionMessage | Uint8Array) => Promise<Signature>;
};

/**
 * Generates a new random Ed25519 keypair as a {@link Signer}.
 * Private key is non-extractable (held in Web Crypto key store).
 * @returns Freshly generated {@link Signer}.
 */
export async function signerGenerate(): Promise<Signer> {
  const keypair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, [
    "sign",
    "verify",
  ]);
  const publicSpki = await crypto.subtle.exportKey("spki", keypair.publicKey);
  const address = pubkeyFromBytes(new Uint8Array(publicSpki).slice(-32));
  return signerFromPrivateKey(keypair.privateKey, address);
}

/**
 * Creates a {@link Signer} from a 64-byte secret key (32-byte seed + 32-byte pubkey).
 * @param secret - Exactly 64 bytes.
 * @param options.skipVerification - Skip keypair consistency check.
 * @returns {@link Signer} for the provided secret.
 * @throws If not 64 bytes or if keypair is mismatched.
 */
export async function signerFromSecret(
  secret: Uint8Array,
  options?: { skipVerification?: boolean },
): Promise<Signer> {
  if (secret.length != 64) {
    throw new Error(
      `Signer: Expected a secret of 64 bytes (found ${secret.length})`,
    );
  }
  const pkcs8Bytes = new Uint8Array([
    0x30,
    0x2e,
    0x02,
    0x01,
    0x00,
    0x30,
    0x05,
    0x06,
    0x03,
    0x2b,
    0x65,
    0x70,
    0x04,
    0x22,
    0x04,
    0x20,
    ...secret.slice(0, 32),
  ]);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Bytes,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const address = pubkeyFromBytes(secret.slice(32, 64));
  const signer = signerFromPrivateKey(privateKey, address);
  if (options?.skipVerification) {
    return signer;
  }
  const message = new Uint8Array([1, 2, 3, 4, 5]);
  const signature = await signer.sign(message);
  const verifier = await pubkeyToVerifier(address);
  if (!(await verifier(signature, message))) {
    throw new Error(`Signer: Secret public key and private key mismatch`);
  }
  return signer;
}

function signerFromPrivateKey(privateKey: CryptoKey, address: Pubkey): Signer {
  return {
    address,
    sign: async (message: TransactionMessage | Uint8Array) => {
      const output = await crypto.subtle.sign(
        "Ed25519",
        privateKey,
        message as BufferSource,
      );
      return signatureFromBytes(new Uint8Array(output));
    },
  };
}

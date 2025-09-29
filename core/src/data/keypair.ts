import { Signature } from "../types";
import { base58Decode, base58Encode } from "./base58";
import { Pubkey } from "./pubkey";

export class Keypair {
  public readonly pubkey: Pubkey;
  public readonly sign: (message: Uint8Array) => Promise<Signature>;
  public readonly verify: (
    message: Uint8Array,
    signature: Signature,
  ) => Promise<boolean>;

  private constructor(
    pubkey: Pubkey,
    sign: (message: Uint8Array) => Promise<Signature>,
    verify: (message: Uint8Array, signature: Signature) => Promise<boolean>,
  ) {
    this.pubkey = pubkey;
    this.sign = sign;
    this.verify = verify;
  }

  static async generate(): Promise<Keypair> {
    if (globalThis.crypto?.subtle !== undefined) {
      return this.generateWebCrypto();
    }
    return this.generateNodeCrypto();
  }

  static async generateWebCrypto(): Promise<Keypair> {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
      { name: "Ed25519" },
      false,
      ["sign", "verify"],
    );
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    const pkRaw = extractRawEd25519Pub(spki);
    return new Keypair(
      base58Encode(pkRaw),
      async (message: Uint8Array) => {
        return base58Encode(
          new Uint8Array(
            await crypto.subtle.sign(
              "Ed25519",
              privateKey,
              message as BufferSource,
            ),
          ),
        );
      },
      async (message: Uint8Array, signature: Signature) => {
        return await crypto.subtle.verify(
          "Ed25519",
          publicKey,
          base58Decode(signature) as BufferSource,
          message as BufferSource,
        );
      },
    );
  }

  static async generateNodeCrypto(): Promise<Keypair> {
    const crypto = await import("crypto");
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const spki = publicKey.export({ type: "spki", format: "der" });
    const pkRaw = extractRawEd25519Pub(spki.buffer as ArrayBuffer);
    return new Keypair(
      base58Encode(pkRaw),
      async (message: Uint8Array) => {
        return base58Encode(
          new Uint8Array(crypto.sign(null, message, privateKey)),
        );
      },
      async (message: Uint8Array, signature: Signature) => {
        return crypto.verify(null, message, publicKey, base58Decode(signature));
      },
    );
  }
}

function extractRawEd25519Pub(spkiDer: ArrayBuffer): Uint8Array {
  const bytes = new Uint8Array(spkiDer);
  return bytes.slice(-32);
}

import { Signature } from "../types";
import { base58Decode, base58Encode } from "./base58";
import { Pubkey } from "./pubkey";

// TODO - naming and naming casing
export class KeyPair {
  public readonly pubKey: Pubkey;
  public readonly sign: (message: Uint8Array) => Promise<Signature>;
  public readonly verify: (
    message: Uint8Array,
    signature: Signature,
  ) => Promise<boolean>;

  private constructor(
    pubKey: Pubkey,
    sign: (message: Uint8Array) => Promise<Signature>,
    verify: (message: Uint8Array, signature: Signature) => Promise<boolean>,
  ) {
    this.pubKey = pubKey;
    this.sign = sign;
    this.verify = verify;
  }

  static async generate(): Promise<KeyPair> {
    if (globalThis.crypto?.subtle !== undefined) {
      return this.generateWeb();
    }
    return this.generateNode();
  }

  static async fromSecret(secret: Uint8Array): Promise<KeyPair> {
    if (secret.length != 64) {
      throw new Error(
        `KeyPair: Expected a secret of 64 bytes (found ${secret.length})`,
      );
    }
    let keyPair: KeyPair;
    if (globalThis.crypto?.subtle !== undefined) {
      keyPair = await this.fromSecretWeb(secret);
    }
    keyPair = await this.fromSecretNode(secret);
    const message = new Uint8Array();
    if (!(await keyPair.verify(message, await keyPair.sign(message)))) {
      throw new Error(`KeyPair: Secret public and private key mismatch`);
    }
    return keyPair;
  }

  private static async generateWeb(): Promise<KeyPair> {
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
      { name: "Ed25519" },
      false,
      ["sign", "verify"],
    );
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    return new KeyPair(
      extractPubkeyFromSpki(new Uint8Array(spki)),
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

  private static async fromSecretWeb(secret: Uint8Array): Promise<KeyPair> {
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8FromEd25519(secret.slice(0, 32)) as BufferSource,
      { name: "Ed25519" },
      false,
      ["sign"],
    );
    const publicKey = await crypto.subtle.importKey(
      "spki",
      spkiFromEd25519(secret.slice(32, 64)) as BufferSource,
      { name: "Ed25519" },
      true,
      ["verify"],
    );
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    // TODO - re-use this part
    return new KeyPair(
      extractPubkeyFromSpki(new Uint8Array(spki)),
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

  private static async generateNode(): Promise<KeyPair> {
    const crypto = await import("crypto");
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const spki = publicKey.export({ type: "spki", format: "der" });
    return new KeyPair(
      extractPubkeyFromSpki(new Uint8Array(spki)),
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

  private static async fromSecretNode(secret: Uint8Array): Promise<KeyPair> {
    const crypto = await import("crypto");
    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(pkcs8FromEd25519(secret.slice(0, 32))),
      format: "der",
      type: "pkcs8",
    });
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(spkiFromEd25519(secret.slice(32, 64))),
      format: "der",
      type: "spki",
    });
    const spki = publicKey.export({ type: "spki", format: "der" });
    return new KeyPair(
      extractPubkeyFromSpki(new Uint8Array(spki)),
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

function extractPubkeyFromSpki(spkiDer: Uint8Array): string {
  return base58Encode(spkiDer.slice(-32));
}

function pkcs8FromEd25519(blob32: Uint8Array): Uint8Array {
  let index = 0;
  const pkcs8 = new Uint8Array(48);
  pkcs8[index++] = 0x30;
  pkcs8[index++] = 0x2e; // SEQ len=46
  pkcs8[index++] = 0x02;
  pkcs8[index++] = 0x01;
  pkcs8[index++] = 0x00; // INT 0
  pkcs8[index++] = 0x30;
  pkcs8[index++] = 0x05; // SEQ len=5
  pkcs8[index++] = 0x06;
  pkcs8[index++] = 0x03;
  pkcs8[index++] = 0x2b;
  pkcs8[index++] = 0x65;
  pkcs8[index++] = 0x70; // OID 1.3.101.112 (Ed25519)
  pkcs8[index++] = 0x04;
  pkcs8[index++] = 0x22; // OCTET STRING len=34
  pkcs8[index++] = 0x04;
  pkcs8[index++] = 0x20; //   inner OCTET STRING len=32
  pkcs8.set(blob32, 16);
  return pkcs8;
}

function spkiFromEd25519(blob32: Uint8Array): Uint8Array {
  let index = 0;
  const spki = new Uint8Array(44);
  spki[index++] = 0x30;
  spki[index++] = 0x2a; // SEQUENCE, len 42
  spki[index++] = 0x30;
  spki[index++] = 0x05; // SEQUENCE, len 5
  spki[index++] = 0x06;
  spki[index++] = 0x03; // OID, len 3
  spki[index++] = 0x2b;
  spki[index++] = 0x65;
  spki[index++] = 0x70; // 1.3.101.112 (Ed25519)
  spki[index++] = 0x03;
  spki[index++] = 0x21;
  spki[index++] = 0x00; // BIT STRING, len 33, 0 unused bits
  spki.set(blob32, 12);
  return spki;
}

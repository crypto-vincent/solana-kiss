import { base58Decode, base58Encode } from "./Base58";
import { Signature } from "./Execution";
import { Pubkey } from "./Pubkey";

export type Keypair = {
  address: Pubkey;
  sign: (message: Uint8Array) => Promise<Signature>;
  verify: (message: Uint8Array, signature: Signature) => Promise<boolean>;
};

export async function keypairGenerate(): Promise<Keypair> {
  if (globalThis.crypto?.subtle !== undefined) {
    return keypairGenerateWeb();
  }
  return keypairGenerateNode();
}

export async function keypairFromSecret(
  secret: Uint8Array,
  options?: { skipValidation?: boolean },
): Promise<Keypair> {
  if (secret.length != 64) {
    throw new Error(
      `Keypair: Expected a secret of 64 bytes (found ${secret.length})`,
    );
  }
  let keypair: Keypair;
  if (globalThis.crypto?.subtle !== undefined) {
    keypair = await keypairFromSecretWeb(secret);
  }
  keypair = await keypairFromSecretNode(secret);
  if (!options?.skipValidation) {
    const message = new Uint8Array();
    if (!(await keypair.verify(message, await keypair.sign(message)))) {
      throw new Error(`Keypair: Secret public blob and private blob mismatch`);
    }
  }
  return keypair;
}

async function keypairGenerateWeb(): Promise<Keypair> {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    false,
    ["sign", "verify"],
  );
  return keypairWeb(privateKey, publicKey);
}

async function keypairFromSecretWeb(secret: Uint8Array): Promise<Keypair> {
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
  return keypairWeb(privateKey, publicKey);
}

async function keypairWeb(privateKey: any, publicKey: any): Promise<Keypair> {
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return {
    address: extractPubkeyFromSpki(new Uint8Array(spki)),
    sign: async (message: Uint8Array) => {
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
    verify: async (message: Uint8Array, signature: Signature) => {
      return await crypto.subtle.verify(
        "Ed25519",
        publicKey,
        base58Decode(signature) as BufferSource,
        message as BufferSource,
      );
    },
  };
}

async function keypairGenerateNode(): Promise<Keypair> {
  const crypto = await import("crypto");
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
  return keypairNode(privateKey, publicKey);
}

async function keypairFromSecretNode(secret: Uint8Array): Promise<Keypair> {
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
  return keypairNode(privateKey, publicKey);
}

async function keypairNode(privateKey: any, publicKey: any): Promise<Keypair> {
  const crypto = await import("crypto");
  const spki = publicKey.export({ type: "spki", format: "der" });
  return {
    address: extractPubkeyFromSpki(new Uint8Array(spki)),
    sign: async (message: Uint8Array) => {
      return base58Encode(
        new Uint8Array(crypto.sign(null, message, privateKey)),
      );
    },
    verify: async (message: Uint8Array, signature: Signature) => {
      return !!crypto.verify(null, message, publicKey, base58Decode(signature));
    },
  };
}

function extractPubkeyFromSpki(spkiDer: Uint8Array): string {
  return base58Encode(spkiDer.slice(-32));
}

function pkcs8FromEd25519(secretBlob32: Uint8Array): Uint8Array {
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
  pkcs8.set(secretBlob32, 16);
  return pkcs8;
}

function spkiFromEd25519(publicBlob32: Uint8Array): Uint8Array {
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
  spki.set(publicBlob32, 12);
  return spki;
}

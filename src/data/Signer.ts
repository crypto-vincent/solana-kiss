import { Pubkey, pubkeyFromBytes, pubkeyToVerifier } from "./Pubkey";
import { Signature, signatureFromBytes } from "./Signature";

export type Signer = {
  address: Pubkey;
  sign: (message: Uint8Array) => Promise<Signature>;
};

export async function signerGenerate(): Promise<Signer> {
  const keypair = await crypto.subtle.generateKey({ name: "Ed25519" }, false, [
    "sign",
    "verify",
  ]);
  const publicSpki = await crypto.subtle.exportKey("spki", keypair.publicKey);
  const address = pubkeyFromBytes(new Uint8Array(publicSpki).slice(-32));
  return signerFromKeys(keypair.privateKey, address);
}

export async function signerFromSecret(
  secret: Uint8Array,
  options?: { skipValidation?: boolean },
): Promise<Signer> {
  if (secret.length != 64) {
    throw new Error(
      `Signer: Expected a secret of 64 bytes (found ${secret.length})`,
    );
  }
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
  pkcs8.set(secret.slice(0, 32), 16);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const address = pubkeyFromBytes(secret.slice(32, 64));
  const signer = signerFromKeys(cryptoKey, address);
  if (options?.skipValidation) {
    return signer;
  }
  const message = new Uint8Array([1, 2, 3, 4, 5]);
  const verifier = await pubkeyToVerifier(address);
  if (!(await verifier(await signer.sign(message), message))) {
    throw new Error(`Signer: Secret public blob and private blob mismatch`);
  }
  return signer;
}

function signerFromKeys(cryptoKey: CryptoKey, address: Pubkey): Signer {
  return {
    address,
    sign: async (message: Uint8Array) => {
      const output = await crypto.subtle.sign(
        "Ed25519",
        cryptoKey,
        message as BufferSource,
      );
      return signatureFromBytes(new Uint8Array(output));
    },
  };
}

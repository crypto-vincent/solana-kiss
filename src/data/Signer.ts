import { Keypair, keypairFromSecret, keypairGenerate } from "./Keypair";
import { Pubkey } from "./Pubkey";
import { Signature, signatureFromBytes } from "./Signature";

export type Signer = {
  address: Pubkey;
  sign: (message: Uint8Array) => Promise<Signature>;
};

export function signerFromKeypair(keypair: Keypair): Signer {
  return {
    address: keypair.pubkey,
    sign: async (message) => signatureFromBytes(await keypair.sign(message)),
  };
}

export async function signerFromSecret(secret: Uint8Array): Promise<Signer> {
  return signerFromKeypair(await keypairFromSecret(secret));
}

export async function signerGenerate(): Promise<Signer> {
  return signerFromKeypair(await keypairGenerate());
}

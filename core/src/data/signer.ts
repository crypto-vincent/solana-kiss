import { Signature } from "../types";
import { keypairFromSecret, keypairGenerate } from "./keypair";
import { Pubkey } from "./pubkey";

export type Signer = {
  address: Pubkey;
  sign: (message: Uint8Array) => Promise<Signature>;
};

export function signerGenerate(): Promise<Signer> {
  return keypairGenerate();
}

export function signerFromSecret(secret: Uint8Array): Promise<Signer> {
  return keypairFromSecret(secret);
}

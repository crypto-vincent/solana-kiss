import { Pubkey } from "./Pubkey";

export type Blockhash = string;
export type Signature = string;

export type Input = {
  address: Pubkey;
  signing: boolean;
  writable: boolean;
};

export type Instruction = {
  programAddress: Pubkey;
  inputs: Array<Input>;
  data: Uint8Array;
};

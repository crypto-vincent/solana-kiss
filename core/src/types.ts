import { JsonValue } from "./data/json";
import { Pubkey } from "./data/pubkey";

export type Commitment = "processed" | "confirmed" | "finalized";

export type Slot = number; // TODO - clarify those names and consider using bigint
export type Hash = string; // TODO - should this be Uint8Array ?

export type PrivateKey = Uint8Array; // TODO - how ?

export type Lamports = string;

// TODO - keypair/privatekey type?
export type Signature = string;

export type Input = {
  address: Pubkey;
  writable: boolean;
  signer: boolean;
};

export type Instruction = {
  programAddress: Pubkey;
  inputs: Array<Input>;
  data: Uint8Array;
};

export type Message = {
  payerAddress: Pubkey;
  instructions: Array<Instruction>;
  recentBlockHash: Hash;
};

export type Invokation = {
  instruction: Instruction;
  invokations: Array<Invokation>;
};

export type Transaction = {
  slot: Slot;
  message: Message;
  error: JsonValue | undefined;
  logs: Array<string>;
  chargedFees: Lamports;
  computeUnitsConsumed: number;
  invokations: Array<Invokation>;
};

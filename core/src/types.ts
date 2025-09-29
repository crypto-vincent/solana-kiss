import { JsonValue } from "./data/json";

export type Commitment = "processed" | "confirmed" | "finalized";

export type Slot = number; // TODO - clarify those names and consider using bigint
export type Hash = string; // TODO - should this be Uint8Array ?

export type PrivateKey = Uint8Array; // TODO - how ?

export type PublicKey = string; // TODO - should this be a stronger type ?
export type Lamports = string;

// TODO - keypair/privatekey type?
export type Signature = string;

export type Input = {
  address: PublicKey;
  writable: boolean;
  signer: boolean;
};

export type Instruction = {
  programAddress: PublicKey;
  inputs: Array<Input>;
  data: Uint8Array;
};

export type Transaction = {
  payerAddress: PublicKey;
  instructions: Array<Instruction>;
  recentBlockHash: Hash;
};

export type Execution = {
  slot: Slot;
  transaction: Transaction;
  error: JsonValue | undefined;
  logs: Array<string>;
  chargedFees: Lamports;
  computeUnitsConsumed: number;
  invokations: Array<Invokation>;
};

export type Invokation = {
  instruction: Instruction;
  invokations: Array<Invokation>;
};

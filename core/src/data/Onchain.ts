import { JsonValue } from "./Json";
import { Lamports } from "./Lamports";
import { Message } from "./Message";
import { Pubkey } from "./Pubkey";

export type Commitment = "confirmed" | "finalized";

export type Slot = number;
export type Hash = string;
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

export type Transaction = {
  slot: Slot;
  message: Message;
  error: JsonValue | undefined;
  logs: Array<string>;
  chargedFees: Lamports;
  consumedComputeUnits: number;
  invokations: Array<Invokation>;
};

export type Invokation = {
  instruction: Instruction;
  invokations: Array<Invokation>;
};

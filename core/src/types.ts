import { JsonValue } from "./data/Json";
import { Lamports } from "./data/Lamports";
import { Message } from "./data/Message";
import { Pubkey } from "./data/Pubkey";

export type Commitment = "confirmed" | "finalized";

export type Slot = number;
export type Hash = string;
export type Signature = string;

export type Input = {
  address: Pubkey;
  writable: boolean;
  signing: boolean;
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

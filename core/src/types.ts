import { JsonValue } from "./data/json";
import { Lamports } from "./data/lamports";
import { Message } from "./data/message";
import { Pubkey } from "./data/pubkey";

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
  computeUnitsConsumed: number;
  invokations: Array<Invokation>;
};

export type Invokation = {
  instruction: Instruction;
  invokations: Array<Invokation>;
};

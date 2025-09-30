import { JsonValue } from "./data/json";
import { Lamports } from "./data/lamports";
import { Message } from "./data/message";
import { Pubkey } from "./data/pubkey";

export type Commitment = "processed" | "confirmed" | "finalized";

export type Slot = number; // TODO - clarify those names and consider using bigint
export type Hash = string; // TODO - should this be Uint8Array ?

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
